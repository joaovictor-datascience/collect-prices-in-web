import atexit
import os

import psycopg2
from psycopg2 import pool as _pg_pool
from dotenv import load_dotenv
from shared.schema import ensure_all_schema

load_dotenv()

_db_pool = None


def _get_pool():
    """Lazy-initialize the connection pool on first use."""
    global _db_pool
    if _db_pool is None:
        _db_pool = _pg_pool.ThreadedConnectionPool(
            minconn=1,
            maxconn=5,
            dsn=os.getenv("DATABASE_URL"),
        )
        atexit.register(_db_pool.closeall)
    return _db_pool


class PooledConnection:
    """Context manager that borrows a connection from the pool and returns it on exit."""

    def __init__(self):
        self.conn = _get_pool().getconn()

    def __enter__(self):
        return self.conn

    def __exit__(self, exc_type, exc_val, exc_tb):
        if exc_type:
            self.conn.rollback()
        else:
            self.conn.commit()
        _get_pool().putconn(self.conn)
        return False


def get_connection():
    return PooledConnection()


def create_tables():
    ensure_all_schema(get_connection)


def get_products_to_scrape(product_ids: list[int] | None = None) -> dict:
    """Return active products and URLs as {"name": ["url1", "url2"], ...}."""
    if product_ids is not None and not product_ids:
        return {}

    with get_connection() as conn:
        with conn.cursor() as cur:
            query = """
                SELECT p.name, pu.url
                FROM product_urls pu
                JOIN products p ON p.id = pu.product_id
                WHERE pu.active = TRUE
                  AND p.active = TRUE
            """
            params = []

            if product_ids is not None:
                query += """
                  AND p.id = ANY(%s)
                """
                params.append(product_ids)

            query += """
                ORDER BY p.name
            """

            cur.execute(query, tuple(params))
            rows = cur.fetchall()

    products = {}
    for name, url in rows:
        products.setdefault(name, []).append(url)
    return products


def get_or_create_product(conn, name: str) -> int:
    with conn.cursor() as cur:
        cur.execute(
            "INSERT INTO products (name) VALUES (%s)"
            " ON CONFLICT (name) DO NOTHING",
            (name,)
        )
        cur.execute(
            "SELECT id FROM products WHERE name = %s",
            (name,)
        )
        return cur.fetchone()[0]


def get_or_create_store(conn, store_name: str) -> int:
    with conn.cursor() as cur:
        cur.execute(
            "INSERT INTO stores (name) VALUES (%s)"
            " ON CONFLICT (name) DO NOTHING",
            (store_name,)
        )
        cur.execute(
            "SELECT id FROM stores WHERE name = %s",
            (store_name,)
        )
        return cur.fetchone()[0]


def _save_result_with_connection(conn, result: dict):
    product_id = get_or_create_product(conn, result["product_name"])
    store_id = get_or_create_store(conn, result["store"])
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO price_history (product_id, store_id, price, url, scraped_at)
            VALUES (%s, %s, %s, %s, %s)
            """,
            (product_id, store_id, result["price"], result["url"], result["scraped_at"])
        )


def save_result(result: dict):
    with get_connection() as conn:
        _save_result_with_connection(conn, result)
