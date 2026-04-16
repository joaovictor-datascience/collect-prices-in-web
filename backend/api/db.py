import atexit
import os
from urllib.parse import urlparse

import psycopg2
from psycopg2 import pool as _pg_pool
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv
from shared.schema import ensure_all_schema

load_dotenv()

_db_pool = None


def _get_pool():
    """Lazy-initialize the connection pool on first use."""
    global _db_pool
    if _db_pool is None:
        _db_pool = _pg_pool.ThreadedConnectionPool(
            minconn=2,
            maxconn=10,
            dsn=os.getenv("DATABASE_URL"),
            cursor_factory=RealDictCursor,
        )
        atexit.register(_db_pool.closeall)
    return _db_pool


class PooledConnection:
    """Context manager that returns a connection to the pool on exit."""

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


def get_db_connection():
    return PooledConnection()


def ensure_schema():
    ensure_all_schema(get_db_connection)


def normalize_optional_text(value):
    # Store empty strings as NULL so optional fields remain truly optional.
    if value is None:
        return None

    normalized = value.strip()
    return normalized or None


def normalize_required_text(value, field_name, max_length=200):
    normalized = normalize_optional_text(value)
    if not normalized:
        raise ValueError(f"{field_name} is required")
    if len(normalized) > max_length:
        raise ValueError(f"{field_name} cannot exceed {max_length} characters")
    return normalized


def validate_url(url):
    """Block non-HTTP URLs to prevent XSS via javascript: scheme."""
    parsed = urlparse(url)
    if parsed.scheme not in ('http', 'https'):
        raise ValueError("URL must start with http:// or https://")
    return url


def get_product_display_order():
    # Prefer grouped products first, then fall back to the product name.
    return "ORDER BY COALESCE(group_name, name), name"
