"""Shared job persistence helpers for the scraper execution pipeline."""

from psycopg2 import errors
from psycopg2.extras import Json, RealDictCursor

PENDING = "pending"
RUNNING = "running"
COMPLETED = "completed"
COMPLETED_WITH_ERRORS = "completed_with_errors"
FAILED = "failed"

MANUAL = "manual"
SCHEDULED = "scheduled"

ACTIVE_STATUSES = (PENDING, RUNNING)

JOB_SELECT_COLUMNS = """
    id, status, trigger_type, requested_by, target_product_ids, requested_at, started_at, finished_at,
    error_message, total_products, total_urls, successful_urls, failed_urls, unsupported_urls, saved_results
"""


def _fetchone(connection, query, params=()):
    with connection.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(query, params)
        return cur.fetchone()


def _fetchall(connection, query, params=()):
    with connection.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(query, params)
        return cur.fetchall()


def get_active_job(connection_factory):
    with connection_factory() as conn:
        return _fetchone(
            conn,
            """
            SELECT """ + JOB_SELECT_COLUMNS + """
              FROM scraper_jobs
             WHERE status = ANY(%s)
             ORDER BY requested_at ASC, id ASC
             LIMIT 1
            """,
            (list(ACTIVE_STATUSES),)
        )


def try_enqueue_job(connection_factory, trigger_type, requested_by=None, target_product_ids=None):
    try:
        with connection_factory() as conn:
            job = _fetchone(
                conn,
                """
                INSERT INTO scraper_jobs (status, trigger_type, requested_by, target_product_ids)
                VALUES (%s, %s, %s, %s)
                RETURNING """ + JOB_SELECT_COLUMNS + """
                """,
                (PENDING, trigger_type, requested_by, target_product_ids)
            )
        return job, None
    except errors.UniqueViolation:
        return None, get_active_job(connection_factory)


def claim_pending_job(connection_factory):
    with connection_factory() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                SELECT id
                  FROM scraper_jobs
                 WHERE status = %s
                 ORDER BY requested_at ASC, id ASC
                 LIMIT 1
                 FOR UPDATE SKIP LOCKED
                """,
                (PENDING,)
            )
            claimed = cur.fetchone()
            if not claimed:
                return None

            cur.execute(
                """
                UPDATE scraper_jobs
                   SET status = %s,
                       started_at = COALESCE(started_at, NOW()),
                       error_message = NULL
                 WHERE id = %s
                 RETURNING """ + JOB_SELECT_COLUMNS + """
                """,
                (RUNNING, claimed["id"])
            )
            return cur.fetchone()


def append_job_log(
    connection_factory,
    job_id,
    *,
    level,
    event_type,
    message,
    product_name=None,
    url=None,
    store_name=None,
    details=None,
):
    with connection_factory() as conn:
        return _fetchone(
            conn,
            """
            INSERT INTO scraper_job_logs (
                job_id, level, event_type, product_name, url, store_name, message, details
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id, created_at, level, event_type, product_name, url, store_name, message, details
            """,
            (
                job_id,
                level,
                event_type,
                product_name,
                url,
                store_name,
                message,
                Json(details or {}),
            ),
        )


def update_job_progress(connection_factory, job_id, summary):
    with connection_factory() as conn:
        return _fetchone(
            conn,
            """
            UPDATE scraper_jobs
               SET total_products = %s,
                   total_urls = %s,
                   successful_urls = %s,
                   failed_urls = %s,
                   unsupported_urls = %s,
                   saved_results = %s
             WHERE id = %s
             RETURNING """ + JOB_SELECT_COLUMNS + """
            """,
            (
                summary["total_products"],
                summary["total_urls"],
                summary["successful_urls"],
                summary["failed_urls"],
                summary["unsupported_urls"],
                summary["saved_results"],
                job_id,
            ),
        )


def finalize_job(connection_factory, job_id, *, status, summary, error_message=None):
    with connection_factory() as conn:
        return _fetchone(
            conn,
            """
            UPDATE scraper_jobs
               SET status = %s,
                   finished_at = NOW(),
                   error_message = %s,
                   total_products = %s,
                   total_urls = %s,
                   successful_urls = %s,
                   failed_urls = %s,
                   unsupported_urls = %s,
                   saved_results = %s
             WHERE id = %s
             RETURNING """ + JOB_SELECT_COLUMNS + """
            """,
            (
                status,
                error_message,
                summary["total_products"],
                summary["total_urls"],
                summary["successful_urls"],
                summary["failed_urls"],
                summary["unsupported_urls"],
                summary["saved_results"],
                job_id,
            ),
        )


def get_job(connection_factory, job_id):
    with connection_factory() as conn:
        return _fetchone(
            conn,
            """
            SELECT """ + JOB_SELECT_COLUMNS + """
              FROM scraper_jobs
             WHERE id = %s
            """,
            (job_id,)
        )


def get_latest_job(connection_factory):
    with connection_factory() as conn:
        return _fetchone(
            conn,
            """
            SELECT """ + JOB_SELECT_COLUMNS + """
              FROM scraper_jobs
             ORDER BY requested_at DESC, id DESC
             LIMIT 1
            """
        )


def list_jobs(connection_factory, limit=15):
    with connection_factory() as conn:
        return _fetchall(
            conn,
            """
            SELECT """ + JOB_SELECT_COLUMNS + """
              FROM scraper_jobs
             ORDER BY requested_at DESC, id DESC
             LIMIT %s
            """,
            (limit,)
        )


def get_job_logs(connection_factory, job_id, after_log_id=None):
    params = [job_id]
    extra_filter = ""

    if after_log_id is not None:
        extra_filter = "AND id > %s"
        params.append(after_log_id)

    with connection_factory() as conn:
        return _fetchall(
            conn,
            f"""
            SELECT id, created_at, level, event_type, product_name, url, store_name, message, details
              FROM scraper_job_logs
             WHERE job_id = %s
               {extra_filter}
             ORDER BY id ASC
            """,
            tuple(params),
        )


def build_job_response(job, logs):
    if job is None:
        return None

    return {
        **build_job_summary(job),
        "logs": logs,
    }


def build_job_summary(job):
    return {
        "id": job["id"],
        "status": job["status"],
        "trigger_type": job["trigger_type"],
        "requested_by": job["requested_by"],
        "target_product_ids": job["target_product_ids"],
        "requested_at": job["requested_at"],
        "started_at": job["started_at"],
        "finished_at": job["finished_at"],
        "error_message": job["error_message"],
        "summary": {
            "total_products": job["total_products"],
            "total_urls": job["total_urls"],
            "successful_urls": job["successful_urls"],
            "failed_urls": job["failed_urls"],
            "unsupported_urls": job["unsupported_urls"],
            "saved_results": job["saved_results"],
        },
    }
