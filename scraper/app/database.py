import os

import psycopg2
from dotenv import load_dotenv

load_dotenv()


def get_connection():
    return psycopg2.connect(os.getenv("DATABASE_URL"))


def create_tables():
    # Keep schema creation and lightweight migration together so the scraper can
    # bootstrap a fresh database and upgrade older product rows in one pass.
    sql = """
    CREATE TABLE IF NOT EXISTS products (
        id          SERIAL PRIMARY KEY,
        name        TEXT NOT NULL,
        group_name  TEXT,
        active      BOOLEAN DEFAULT TRUE,
        created_at  TIMESTAMPTZ DEFAULT NOW(),
        updated_at  TIMESTAMPTZ DEFAULT NOW()
    );

    ALTER TABLE products
        ADD COLUMN IF NOT EXISTS name TEXT;

    ALTER TABLE products
        ADD COLUMN IF NOT EXISTS group_name TEXT;

    UPDATE products
       SET name = group_name
     WHERE name IS NULL
       AND group_name IS NOT NULL;

    ALTER TABLE products
        ALTER COLUMN name SET NOT NULL;

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

    CREATE UNIQUE INDEX IF NOT EXISTS idx_products_name_unique
        ON products(name);

    CREATE INDEX IF NOT EXISTS idx_products_group_name
        ON products(group_name)
        WHERE group_name IS NOT NULL;

    CREATE INDEX IF NOT EXISTS idx_product_urls_active
        ON product_urls(product_id) WHERE active = TRUE;

    DO $$
    BEGIN
        IF EXISTS (
            SELECT 1
              FROM information_schema.table_constraints
             WHERE table_name = 'products'
               AND constraint_name = 'products_group_name_key'
        ) THEN
            ALTER TABLE products DROP CONSTRAINT products_group_name_key;
        END IF;
    END $$;
    """
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(sql)


def get_products_to_scrape() -> dict:
    """Return active products and URLs as {"name": ["url1", "url2"], ...}."""
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT p.name, pu.url
                FROM product_urls pu
                JOIN products p ON p.id = pu.product_id
                WHERE pu.active = TRUE
                  AND p.active = TRUE
                ORDER BY p.name
            """)
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


def save_result(result: dict):
    with get_connection() as conn:
        # Resolve foreign keys before inserting the historical price snapshot.
        product_id = get_or_create_product(conn, result["product_name"])
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
