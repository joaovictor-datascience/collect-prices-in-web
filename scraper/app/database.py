import os
from datetime import datetime

import psycopg2
from dotenv import load_dotenv

load_dotenv()


def get_connection():
    return psycopg2.connect(os.getenv("DATABASE_URL"))


def create_tables():
    sql = """
    CREATE TABLE IF NOT EXISTS products (
        id          SERIAL PRIMARY KEY,
        group_name  TEXT UNIQUE NOT NULL,
        active      BOOLEAN DEFAULT TRUE,
        created_at  TIMESTAMPTZ DEFAULT NOW(),
        updated_at  TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS product_urls (
        id          SERIAL PRIMARY KEY,
        product_id  INT REFERENCES products(id) ON DELETE CASCADE,
        url         TEXT UNIQUE NOT NULL,
        active      BOOLEAN DEFAULT TRUE,
        created_at  TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS stores (
        id    SERIAL PRIMARY KEY,
        name  TEXT UNIQUE NOT NULL
    );

    CREATE TABLE IF NOT EXISTS price_history (
        id          SERIAL PRIMARY KEY,
        product_id  INT REFERENCES products(id) ON DELETE SET NULL,
        store_id    INT REFERENCES stores(id) ON DELETE SET NULL,
        price       NUMERIC(12, 2) NOT NULL,
        url         TEXT,
        scraped_at  TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_price_history_lookup
        ON price_history(product_id, scraped_at DESC);

    CREATE INDEX IF NOT EXISTS idx_product_urls_active
        ON product_urls(product_id) WHERE active = TRUE;
    """
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(sql)


def get_products_to_scrape() -> dict:
    """Busca produtos e URLs ativos do banco.
    Retorna: {"group_name": ["url1", "url2"], ...}
    """
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT p.group_name, pu.url
                FROM product_urls pu
                JOIN products p ON p.id = pu.product_id
                WHERE pu.active = TRUE
                  AND p.active = TRUE
                ORDER BY p.group_name
            """)
            rows = cur.fetchall()

    products = {}
    for group_name, url in rows:
        products.setdefault(group_name, []).append(url)
    return products


def get_or_create_product(conn, group_name: str) -> int:
    with conn.cursor() as cur:
        cur.execute(
            "INSERT INTO products (group_name) VALUES (%s)"
            " ON CONFLICT (group_name) DO NOTHING",
            (group_name,)
        )
        cur.execute(
            "SELECT id FROM products WHERE group_name = %s",
            (group_name,)
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


def save_result(result: dict):
    with get_connection() as conn:
        product_id = get_or_create_product(conn, result["product_group"])
        store_id = get_or_create_store(conn, result["store"])

        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO price_history (product_id, store_id, price, url, scraped_at)
                VALUES (%s, %s, %s, %s, %s)
                """,
                (
                    product_id,
                    store_id,
                    result["price"],
                    result["url"],
                    result["scraped_at"],
                )
            )