from flask import Blueprint, jsonify, request
import psycopg2

from api.db import get_db_connection, validate_url

urls_bp = Blueprint('urls', __name__)


@urls_bp.route('/api/products/<int:product_id>/urls', methods=['GET'])
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


@urls_bp.route('/api/products/<int:product_id>/urls', methods=['POST'])
def add_product_url(product_id):
    """Add a URL to a product. Body: {"url": "https://..."}"""
    try:
        data = request.get_json()

        if not data or not data.get('url'):
            return jsonify({"error": "url is required"}), 400

        url = data['url'].strip()
        validate_url(url)

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
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except psycopg2.errors.UniqueViolation:
        return jsonify({"error": "This URL is already registered"}), 409
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@urls_bp.route('/api/urls/<int:url_id>', methods=['PUT'])
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
                    validated_url = data['url'].strip()
                    validate_url(validated_url)
                    values.append(validated_url)

                if 'active' in data:
                    if not isinstance(data['active'], bool):
                        return jsonify({"error": "active must be true or false"}), 400
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
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except psycopg2.errors.UniqueViolation:
        return jsonify({"error": "This URL is already registered for another product"}), 409
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@urls_bp.route('/api/urls/<int:url_id>', methods=['DELETE'])
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
