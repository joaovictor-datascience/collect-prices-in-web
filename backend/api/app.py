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


def normalize_optional_text(value):
    # Store empty strings as NULL so optional fields remain truly optional.
    if value is None:
        return None

    normalized = value.strip()
    return normalized or None


def normalize_required_text(value, field_name):
    normalized = normalize_optional_text(value)
    if not normalized:
        raise ValueError(f"{field_name} is required")
    return normalized


def get_product_display_order():
    # Prefer grouped products first, then fall back to the product name.
    return "ORDER BY COALESCE(group_name, name), name"


# ──────────────────────────────────────────────
#  PRODUCTS — CRUD
# ──────────────────────────────────────────────

@app.route('/api/products', methods=['GET'])
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


@app.route('/api/products', methods=['POST'])
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


@app.route('/api/products/<int:product_id>', methods=['PUT'])
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


@app.route('/api/products/<int:product_id>', methods=['DELETE'])
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


# ──────────────────────────────────────────────
#  PRODUCT URLS — CRUD
# ──────────────────────────────────────────────

@app.route('/api/products/<int:product_id>/urls', methods=['GET'])
def get_product_urls(product_id):
    """List all URLs linked to a product."""
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT id FROM products WHERE id = %s", (product_id,))
                if not cur.fetchone():
                    return jsonify({"error": "Product not found"}), 404

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
    """Add a URL to a product. Body: {"url": "https://..."}"""
    try:
        data = request.get_json()

        if not data or not data.get('url'):
            return jsonify({"error": "url is required"}), 400

        url = data['url'].strip()

        with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT id FROM products WHERE id = %s", (product_id,))
                if not cur.fetchone():
                    return jsonify({"error": "Product not found"}), 404

                cur.execute(
                    """INSERT INTO product_urls (product_id, url)
                       VALUES (%s, %s)
                       RETURNING id, product_id, url, active, created_at""",
                    (product_id, url)
                )
                new_url = cur.fetchone()

        return jsonify(new_url), 201
    except psycopg2.errors.UniqueViolation:
        return jsonify({"error": "This URL is already registered"}), 409
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/urls/<int:url_id>', methods=['PUT'])
def update_url(url_id):
    """Update a URL. Body: {"url": "...", "active": true/false}"""
    try:
        data = request.get_json()

        if not data:
            return jsonify({"error": "Request body cannot be empty"}), 400

        with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT id FROM product_urls WHERE id = %s", (url_id,))
                if not cur.fetchone():
                    return jsonify({"error": "URL not found"}), 404

                fields = []
                values = []

                if 'url' in data:
                    fields.append("url = %s")
                    values.append(data['url'].strip())

                if 'active' in data:
                    fields.append("active = %s")
                    values.append(data['active'])

                if not fields:
                    return jsonify({"error": "No fields provided for update"}), 400

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
        return jsonify({"error": "This URL is already registered for another product"}), 409
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/urls/<int:url_id>', methods=['DELETE'])
def delete_url(url_id):
    """Remove a URL permanently."""
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT id FROM product_urls WHERE id = %s", (url_id,))
                if not cur.fetchone():
                    return jsonify({"error": "URL not found"}), 404

                cur.execute("DELETE FROM product_urls WHERE id = %s", (url_id,))

        return jsonify({"message": "URL removed successfully"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ──────────────────────────────────────────────
#  PRICE HISTORY
# ──────────────────────────────────────────────

@app.route('/api/history/<int:product_id>', methods=['GET'])
def get_price_history(product_id):
    """Return the price history for a product."""
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
#  ANALYTICS (Replaces Frontend hooks computation)
# ──────────────────────────────────────────────

@app.route('/api/analytics/<int:product_id>', methods=['GET'])
def get_product_analytics(product_id):
    """Return the price history, overall stats, and store stats for a product."""
    try:
        days = request.args.get('days', '30')
        
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                # Base query
                date_filter = ""
                params = [product_id]
                
                if days != 'all':
                    try:
                        days_int = int(days)
                        # We use PostgreSQL intervals for precision
                        date_filter = "AND ph.scraped_at >= NOW() - INTERVAL '%s days'"
                        params.append(days_int)
                    except ValueError:
                        pass
                
                query = f"""
                    SELECT ph.id, ph.price, ph.url, ph.scraped_at, s.name as store_name
                    FROM price_history ph
                    JOIN stores s ON ph.store_id = s.id
                    WHERE ph.product_id = %s {date_filter}
                    ORDER BY ph.scraped_at ASC
                """
                
                cur.execute(query, tuple(params))
                history = cur.fetchall()
                
                # If absolutely no data
                if not history:
                    return jsonify({
                        "filteredData": [],
                        "overallStats": {"current": None, "currentStore": None, "min": None, "minStore": None, "max": None, "maxStore": None, "avg": None},
                        "storeStats": []
                    })
                
                # 1. Compute storeStats using the full (unfiltered by store) history
                store_map = {}
                for h in history:
                    store = h['store_name'] or 'Loja'
                    if store not in store_map:
                        store_map[store] = []
                    store_map[store].append(h)
                    
                store_stats = []
                for store, items in store_map.items():
                    store_prices = [float(i['price']) for i in items]
                    latest = items[-1]
                    store_stats.append({
                        "storeName": store,
                        "min": min(store_prices),
                        "max": max(store_prices),
                        "avg": sum(store_prices) / len(store_prices),
                        "samples": len(items),
                        "latestPrice": float(latest['price']),
                        "latestUrl": latest['url'],
                        "latestScrapedAt": latest['scraped_at']
                    })
                
                store_stats.sort(key=lambda x: x["storeName"])
                
                # 2. Filter history if stere filter is provided
                store_filter = request.args.get('store', 'all')
                if store_filter != 'all':
                    history_for_stats = [h for h in history if h['store_name'] == store_filter]
                else:
                    history_for_stats = history
                    
                if not history_for_stats:
                    return jsonify({
                        "filteredData": [],
                        "overallStats": {"current": None, "currentStore": None, "min": None, "minStore": None, "max": None, "maxStore": None, "avg": None},
                        "storeStats": store_stats
                    })

                # 3. Compute overallStats using history_for_stats
                prices = [float(h['price']) for h in history_for_stats]
                min_idx = prices.index(min(prices))
                max_idx = prices.index(max(prices))
                
                filtered_store_map = {}
                for h in history_for_stats:
                    store = h['store_name'] or 'Loja'
                    if store not in filtered_store_map:
                        filtered_store_map[store] = []
                    filtered_store_map[store].append(h)
                
                latest_prices = []
                for store, items in filtered_store_map.items():
                    latest = items[-1]
                    latest_prices.append({
                        "store": store, 
                        "price": float(latest['price'])
                    })
                
                best_latest = min(latest_prices, key=lambda x: x["price"])
                
                overall_stats = {
                    "current": best_latest["price"],
                    "currentStore": best_latest["store"],
                    "min": prices[min_idx],
                    "minStore": history_for_stats[min_idx]['store_name'],
                    "max": prices[max_idx],
                    "maxStore": history_for_stats[max_idx]['store_name'],
                    "avg": sum(prices) / len(prices)
                }
                
                return jsonify({
                    "filteredData": history_for_stats,
                    "overallStats": overall_stats,
                    "storeStats": store_stats
                })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ──────────────────────────────────────────────
#  STORES
# ──────────────────────────────────────────────

@app.route('/api/stores', methods=['GET'])
def get_stores():
    """List all stores."""
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
