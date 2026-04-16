from flask import Blueprint, jsonify, request
import psycopg2

from api.db import (
    get_db_connection,
    get_product_display_order,
    normalize_optional_text,
    normalize_required_text,
    validate_url,
)

products_bp = Blueprint('products', __name__)


@products_bp.route('/api/products', methods=['GET'])
def get_products():
    """List all products. Use ?active=true/false to filter the result set."""
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                active_filter = request.args.get('active')

                if active_filter is not None:
                    active_value = active_filter.lower() == 'true'
                    cur.execute(
                        f"""SELECT id, name, group_name, active, created_at, updated_at
                           FROM products
                           WHERE active = %s
                           {get_product_display_order()}""",
                        (active_value,)
                    )
                else:
                    cur.execute(
                        f"""SELECT id, name, group_name, active, created_at, updated_at
                           FROM products
                           {get_product_display_order()}"""
                    )

                products = cur.fetchall()
        return jsonify(products)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@products_bp.route('/api/products', methods=['POST'])
def create_product():
    """Create a product. Body: {"name": "...", "group_name": "...", "urls": ["url1", "url2"]}"""
    try:
        data = request.get_json()

        if not data:
            return jsonify({"error": "Request body cannot be empty"}), 400

        name = normalize_required_text(data.get('name'), 'name')
        group_name = normalize_optional_text(data.get('group_name'))
        urls = data.get('urls', [])

        with get_db_connection() as conn:
            with conn.cursor() as cur:
                # Create the product first so the URLs can reference its id.
                cur.execute(
                    """INSERT INTO products (name, group_name)
                       VALUES (%s, %s)
                       RETURNING id, name, group_name, active, created_at, updated_at""",
                    (name, group_name)
                )
                product = cur.fetchone()

                # Add only non-empty URLs from the payload.
                created_urls = []
                for url in urls:
                    url = url.strip()
                    if url:
                        validate_url(url)
                        cur.execute(
                            """INSERT INTO product_urls (product_id, url)
                               VALUES (%s, %s)
                               RETURNING id, product_id, url, active, created_at""",
                            (product['id'], url)
                        )
                        created_urls.append(cur.fetchone())

                product['urls'] = created_urls

        return jsonify(product), 201
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except psycopg2.errors.UniqueViolation:
        return jsonify({"error": f"Product '{name}' already exists"}), 409
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@products_bp.route('/api/products/<int:product_id>', methods=['PUT'])
def update_product(product_id):
    """Update a product. Body: {"name": "...", "group_name": "...", "active": true/false}"""
    try:
        data = request.get_json()

        if not data:
            return jsonify({"error": "Request body cannot be empty"}), 400

        with get_db_connection() as conn:
            with conn.cursor() as cur:
                # Fail fast if the product does not exist.
                cur.execute("SELECT id FROM products WHERE id = %s", (product_id,))
                if not cur.fetchone():
                    return jsonify({"error": "Product not found"}), 404

                # Build the update only with the fields present in the request.
                fields = []
                values = []

                if 'name' in data:
                    fields.append("name = %s")
                    values.append(normalize_required_text(data.get('name'), 'name'))

                if 'group_name' in data:
                    fields.append("group_name = %s")
                    values.append(normalize_optional_text(data.get('group_name')))

                if 'active' in data:
                    if not isinstance(data['active'], bool):
                        return jsonify({"error": "active must be true or false"}), 400
                    fields.append("active = %s")
                    values.append(data['active'])

                if not fields:
                    return jsonify({"error": "No fields provided for update"}), 400

                fields.append("updated_at = NOW()")
                values.append(product_id)

                cur.execute(
                    f"""UPDATE products
                        SET {', '.join(fields)}
                        WHERE id = %s
                        RETURNING id, name, group_name, active, created_at, updated_at""",
                    values
                )
                product = cur.fetchone()

        return jsonify(product)
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except psycopg2.errors.UniqueViolation:
        return jsonify({"error": "A product with this name already exists"}), 409
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@products_bp.route('/api/products/<int:product_id>', methods=['DELETE'])
def delete_product(product_id):
    """Hard delete a product and all related links/history."""
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT id FROM products WHERE id = %s", (product_id,))
                if not cur.fetchone():
                    return jsonify({"error": "Product not found"}), 404

                # Remove price history first so no orphan snapshots remain with NULL product_id.
                cur.execute("DELETE FROM price_history WHERE product_id = %s", (product_id,))
                # Related URLs are removed automatically (ON DELETE CASCADE).
                cur.execute("DELETE FROM products WHERE id = %s", (product_id,))

        return jsonify({"message": "Product removed successfully"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
