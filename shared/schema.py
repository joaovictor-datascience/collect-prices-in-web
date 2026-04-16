"""Database schema bootstrap helpers shared across services."""

CORE_SCHEMA_SQL = """
CREATE TABLE IF NOT EXISTS products (
    id          SERIAL PRIMARY KEY,
    name        TEXT NOT NULL,
    group_name  TEXT,
    active      BOOLEAN DEFAULT TRUE,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Legacy migration: ensures columns exist for databases created before the
-- current schema was finalized. Safe to remove once all environments have
-- been fully migrated.
ALTER TABLE products
    ADD COLUMN IF NOT EXISTS name TEXT;

ALTER TABLE products
    ADD COLUMN IF NOT EXISTS group_name TEXT;

ALTER TABLE products
    ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT TRUE;

ALTER TABLE products
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE products
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Backfill: copies group_name into name for rows created before name was required.
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

-- Legacy migration: safe to remove once all environments are fully migrated.
ALTER TABLE product_urls
    ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT TRUE;

ALTER TABLE product_urls
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

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

-- Legacy migration: safe to remove once all environments are fully migrated.
ALTER TABLE price_history
    ADD COLUMN IF NOT EXISTS scraped_at TIMESTAMPTZ DEFAULT NOW();

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

SCRAPER_JOB_SCHEMA_SQL = """
CREATE TABLE IF NOT EXISTS scraper_jobs (
    id                  SERIAL PRIMARY KEY,
    status              TEXT NOT NULL,
    trigger_type        TEXT NOT NULL,
    requested_by        TEXT,
    target_product_ids  INT[],
    requested_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    started_at          TIMESTAMPTZ,
    finished_at         TIMESTAMPTZ,
    error_message       TEXT,
    total_products      INT NOT NULL DEFAULT 0,
    total_urls          INT NOT NULL DEFAULT 0,
    successful_urls     INT NOT NULL DEFAULT 0,
    failed_urls         INT NOT NULL DEFAULT 0,
    unsupported_urls    INT NOT NULL DEFAULT 0,
    saved_results       INT NOT NULL DEFAULT 0
);

ALTER TABLE scraper_jobs
    ADD COLUMN IF NOT EXISTS requested_by TEXT;

ALTER TABLE scraper_jobs
    ADD COLUMN IF NOT EXISTS target_product_ids INT[];

ALTER TABLE scraper_jobs
    ADD COLUMN IF NOT EXISTS requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE scraper_jobs
    ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ;

ALTER TABLE scraper_jobs
    ADD COLUMN IF NOT EXISTS finished_at TIMESTAMPTZ;

ALTER TABLE scraper_jobs
    ADD COLUMN IF NOT EXISTS error_message TEXT;

ALTER TABLE scraper_jobs
    ADD COLUMN IF NOT EXISTS total_products INT NOT NULL DEFAULT 0;

ALTER TABLE scraper_jobs
    ADD COLUMN IF NOT EXISTS total_urls INT NOT NULL DEFAULT 0;

ALTER TABLE scraper_jobs
    ADD COLUMN IF NOT EXISTS successful_urls INT NOT NULL DEFAULT 0;

ALTER TABLE scraper_jobs
    ADD COLUMN IF NOT EXISTS failed_urls INT NOT NULL DEFAULT 0;

ALTER TABLE scraper_jobs
    ADD COLUMN IF NOT EXISTS unsupported_urls INT NOT NULL DEFAULT 0;

ALTER TABLE scraper_jobs
    ADD COLUMN IF NOT EXISTS saved_results INT NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS scraper_job_logs (
    id           BIGSERIAL PRIMARY KEY,
    job_id        INT NOT NULL REFERENCES scraper_jobs(id) ON DELETE CASCADE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    level         TEXT NOT NULL,
    event_type    TEXT NOT NULL,
    product_name  TEXT,
    url           TEXT,
    store_name    TEXT,
    message       TEXT NOT NULL,
    details       JSONB NOT NULL DEFAULT '{}'::jsonb
);

ALTER TABLE scraper_job_logs
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE scraper_job_logs
    ADD COLUMN IF NOT EXISTS product_name TEXT;

ALTER TABLE scraper_job_logs
    ADD COLUMN IF NOT EXISTS url TEXT;

ALTER TABLE scraper_job_logs
    ADD COLUMN IF NOT EXISTS store_name TEXT;

ALTER TABLE scraper_job_logs
    ADD COLUMN IF NOT EXISTS details JSONB NOT NULL DEFAULT '{}'::jsonb;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
          FROM pg_constraint
         WHERE conname = 'scraper_jobs_status_check'
    ) THEN
        ALTER TABLE scraper_jobs
            ADD CONSTRAINT scraper_jobs_status_check
            CHECK (status IN ('pending', 'running', 'completed', 'completed_with_errors', 'failed'));
    END IF;

    IF NOT EXISTS (
        SELECT 1
          FROM pg_constraint
         WHERE conname = 'scraper_jobs_trigger_type_check'
    ) THEN
        ALTER TABLE scraper_jobs
            ADD CONSTRAINT scraper_jobs_trigger_type_check
            CHECK (trigger_type IN ('manual', 'scheduled'));
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_scraper_jobs_requested_at
    ON scraper_jobs(requested_at DESC);

CREATE INDEX IF NOT EXISTS idx_scraper_jobs_status
    ON scraper_jobs(status);

CREATE INDEX IF NOT EXISTS idx_scraper_job_logs_job_id_id
    ON scraper_job_logs(job_id, id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_scraper_jobs_single_active
    ON scraper_jobs ((1))
    WHERE status IN ('pending', 'running');
"""


def _apply_sql(connection_factory, sql):
    with connection_factory() as conn:
        with conn.cursor() as cur:
            cur.execute(sql)


def ensure_core_schema(connection_factory):
    _apply_sql(connection_factory, CORE_SCHEMA_SQL)


def ensure_job_schema(connection_factory):
    _apply_sql(connection_factory, SCRAPER_JOB_SCHEMA_SQL)


def ensure_all_schema(connection_factory):
    _apply_sql(connection_factory, f"{CORE_SCHEMA_SQL}\n{SCRAPER_JOB_SCHEMA_SQL}")
