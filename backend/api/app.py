import os
import sys
from flask import Flask, jsonify, request
from flask_cors import CORS
import psycopg2
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

load_dotenv()

app = Flask(__name__)
CORS(app)


def get_db_connection():
    return psycopg2.connect(os.getenv("DATABASE_URL"), cursor_factory=RealDictCursor)


# ──────────────────────────────────────────────
#  PRODUCTS — CRUD
# ──────────────────────────────────────────────

@app.route('/api/products', methods=['GET'])
def get_products():
    """Lista todos os produtos. Query param ?active=true/false para filtrar."""
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                active_filter = request.args.get('active')

                if active_filter is not None:
                    active_value = active_filter.lower() == 'true'
                    cur.execute(
                        """SELECT id, group_name, active, created_at, updated_at
                           FROM products
                           WHERE active = %s
                           ORDER BY group_name""",
                        (active_value,)
                    )
                else:
                    cur.execute(
                        """SELECT id, group_name, active, created_at, updated_at
                           FROM products
                           ORDER BY group_name"""
                    )

                products = cur.fetchall()
        return jsonify(products)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/products', methods=['POST'])
def create_product():
    """Cria um novo produto. Body: {"group_name": "...", "urls": ["url1", "url2"]}"""
    try:
        data = request.get_json()

        if not data or not data.get('group_name'):
            return jsonify({"error": "group_name é obrigatório"}), 400

        group_name = data['group_name'].strip()
        urls = data.get('urls', [])

        with get_db_connection() as conn:
            with conn.cursor() as cur:
                # Cria o produto
                cur.execute(
                    """INSERT INTO products (group_name)
                       VALUES (%s)
                       RETURNING id, group_name, active, created_at, updated_at""",
                    (group_name,)
                )
                product = cur.fetchone()

                # Adiciona as URLs se fornecidas
                created_urls = []
                for url in urls:
                    url = url.strip()
                    if url:
                        cur.execute(
                            """INSERT INTO product_urls (product_id, url)
                               VALUES (%s, %s)
                               RETURNING id, product_id, url, active, created_at""",
                            (product['id'], url)
                        )
                        created_urls.append(cur.fetchone())

                product['urls'] = created_urls

        return jsonify(product), 201
    except psycopg2.errors.UniqueViolation:
        return jsonify({"error": f"Produto '{group_name}' já existe"}), 409
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/products/<int:product_id>', methods=['PUT'])
def update_product(product_id):
    """Atualiza produto. Body: {"group_name": "...", "active": true/false}"""
    try:
        data = request.get_json()

        if not data:
            return jsonify({"error": "Corpo da requisição vazio"}), 400

        with get_db_connection() as conn:
            with conn.cursor() as cur:
                # Verifica se o produto existe
                cur.execute("SELECT id FROM products WHERE id = %s", (product_id,))
                if not cur.fetchone():
                    return jsonify({"error": "Produto não encontrado"}), 404

                # Monta o update dinamicamente
                fields = []
                values = []

                if 'group_name' in data:
                    fields.append("group_name = %s")
                    values.append(data['group_name'].strip())

                if 'active' in data:
                    fields.append("active = %s")
                    values.append(data['active'])

                if not fields:
                    return jsonify({"error": "Nenhum campo para atualizar"}), 400

                fields.append("updated_at = NOW()")
                values.append(product_id)

                cur.execute(
                    f"""UPDATE products
                        SET {', '.join(fields)}
                        WHERE id = %s
                        RETURNING id, group_name, active, created_at, updated_at""",
                    values
                )
                product = cur.fetchone()

        return jsonify(product)
    except psycopg2.errors.UniqueViolation:
        return jsonify({"error": "Já existe um produto com esse nome"}), 409
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/products/<int:product_id>', methods=['DELETE'])
def delete_product(product_id):
    """Soft delete: desativa o produto e todas as suas URLs."""
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT id FROM products WHERE id = %s", (product_id,))
                if not cur.fetchone():
                    return jsonify({"error": "Produto não encontrado"}), 404

                # Soft delete — desativa produto e todas as URLs
                cur.execute(
                    "UPDATE products SET active = FALSE, updated_at = NOW() WHERE id = %s",
                    (product_id,)
                )
                cur.execute(
                    "UPDATE product_urls SET active = FALSE WHERE product_id = %s",
                    (product_id,)
                )

        return jsonify({"message": "Produto desativado com sucesso"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ──────────────────────────────────────────────
#  PRODUCT URLS — CRUD
# ──────────────────────────────────────────────

@app.route('/api/products/<int:product_id>/urls', methods=['GET'])
def get_product_urls(product_id):
    """Lista as URLs de um produto."""
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT id FROM products WHERE id = %s", (product_id,))
                if not cur.fetchone():
                    return jsonify({"error": "Produto não encontrado"}), 404

                cur.execute(
                    """SELECT id, product_id, url, active, created_at
                       FROM product_urls
                       WHERE product_id = %s
                       ORDER BY created_at""",
                    (product_id,)
                )
                urls = cur.fetchall()
        return jsonify(urls)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/products/<int:product_id>/urls', methods=['POST'])
def add_product_url(product_id):
    """Adiciona uma URL a um produto. Body: {"url": "https://..."}"""
    try:
        data = request.get_json()

        if not data or not data.get('url'):
            return jsonify({"error": "url é obrigatório"}), 400

        url = data['url'].strip()

        with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT id FROM products WHERE id = %s", (product_id,))
                if not cur.fetchone():
                    return jsonify({"error": "Produto não encontrado"}), 404

                cur.execute(
                    """INSERT INTO product_urls (product_id, url)
                       VALUES (%s, %s)
                       RETURNING id, product_id, url, active, created_at""",
                    (product_id, url)
                )
                new_url = cur.fetchone()

        return jsonify(new_url), 201
    except psycopg2.errors.UniqueViolation:
        return jsonify({"error": "Essa URL já está cadastrada"}), 409
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/urls/<int:url_id>', methods=['PUT'])
def update_url(url_id):
    """Atualiza uma URL. Body: {"url": "...", "active": true/false}"""
    try:
        data = request.get_json()

        if not data:
            return jsonify({"error": "Corpo da requisição vazio"}), 400

        with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT id FROM product_urls WHERE id = %s", (url_id,))
                if not cur.fetchone():
                    return jsonify({"error": "URL não encontrada"}), 404

                fields = []
                values = []

                if 'url' in data:
                    fields.append("url = %s")
                    values.append(data['url'].strip())

                if 'active' in data:
                    fields.append("active = %s")
                    values.append(data['active'])

                if not fields:
                    return jsonify({"error": "Nenhum campo para atualizar"}), 400

                values.append(url_id)

                cur.execute(
                    f"""UPDATE product_urls
                        SET {', '.join(fields)}
                        WHERE id = %s
                        RETURNING id, product_id, url, active, created_at""",
                    values
                )
                updated_url = cur.fetchone()

        return jsonify(updated_url)
    except psycopg2.errors.UniqueViolation:
        return jsonify({"error": "Essa URL já está cadastrada em outro produto"}), 409
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/urls/<int:url_id>', methods=['DELETE'])
def delete_url(url_id):
    """Remove uma URL permanentemente."""
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT id FROM product_urls WHERE id = %s", (url_id,))
                if not cur.fetchone():
                    return jsonify({"error": "URL não encontrada"}), 404

                cur.execute("DELETE FROM product_urls WHERE id = %s", (url_id,))

        return jsonify({"message": "URL removida com sucesso"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ──────────────────────────────────────────────
#  PRICE HISTORY
# ──────────────────────────────────────────────

@app.route('/api/history/<int:product_id>', methods=['GET'])
def get_price_history(product_id):
    """Retorna o histórico de preços de um produto."""
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """SELECT ph.id, ph.price, ph.url, ph.scraped_at, s.name as store_name
                       FROM price_history ph
                       JOIN stores s ON ph.store_id = s.id
                       WHERE ph.product_id = %s
                       ORDER BY ph.scraped_at ASC""",
                    (product_id,)
                )
                history = cur.fetchall()
        return jsonify(history)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ──────────────────────────────────────────────
#  STORES
# ──────────────────────────────────────────────

@app.route('/api/stores', methods=['GET'])
def get_stores():
    """Lista todas as lojas."""
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT id, name FROM stores ORDER BY name")
                stores = cur.fetchall()
        return jsonify(stores)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
