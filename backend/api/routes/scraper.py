from flask import Blueprint, jsonify, request

from api.db import get_db_connection
from shared.scraper_jobs import (
    build_job_summary,
    get_job,
    get_job_logs,
    get_latest_job,
    list_jobs,
    try_enqueue_job,
    build_job_response,
)

scraper_bp = Blueprint('scraper', __name__)


def _parse_after_log_id():
    after_log_id = request.args.get('after_log_id')
    if after_log_id is None:
        return None

    try:
        parsed_value = int(after_log_id)
    except ValueError as exc:
        raise ValueError("after_log_id must be an integer") from exc

    if parsed_value < 0:
        raise ValueError("after_log_id cannot be negative")

    return parsed_value


def _parse_limit(default=20, maximum=50):
    raw_limit = request.args.get('limit')
    if raw_limit is None:
        return default

    try:
        parsed_limit = int(raw_limit)
    except ValueError as exc:
        raise ValueError("limit must be an integer") from exc

    if parsed_limit <= 0:
        raise ValueError("limit must be greater than zero")

    return min(parsed_limit, maximum)


def _parse_product_ids(raw_product_ids):
    if raw_product_ids is None:
        return None

    if not isinstance(raw_product_ids, list):
        raise ValueError("product_ids must be an array of product ids")

    if not raw_product_ids:
        raise ValueError("Select at least one product or omit product_ids to run all active products")

    parsed_ids = []
    seen_ids = set()

    for raw_id in raw_product_ids:
        try:
            product_id = int(raw_id)
        except (TypeError, ValueError) as exc:
            raise ValueError("product_ids must contain only integers") from exc

        if product_id <= 0:
            raise ValueError("product_ids must contain only positive integers")

        if product_id not in seen_ids:
            seen_ids.add(product_id)
            parsed_ids.append(product_id)

    return parsed_ids


def _validate_active_product_ids(product_ids):
    if product_ids is None:
        return None

    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id
                  FROM products
                 WHERE active = TRUE
                   AND id = ANY(%s)
                """,
                (product_ids,),
            )
            rows = cur.fetchall()

    found_ids = {row["id"] for row in rows}
    missing_ids = [product_id for product_id in product_ids if product_id not in found_ids]
    if missing_ids:
        raise ValueError(f"Invalid or inactive product ids: {', '.join(map(str, missing_ids))}")

    return product_ids


@scraper_bp.route('/api/scraper/jobs', methods=['GET'])
def list_scraper_jobs():
    try:
        limit = _parse_limit()
        jobs = list_jobs(get_db_connection, limit=limit)
        return jsonify([build_job_summary(job) for job in jobs])
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500


@scraper_bp.route('/api/scraper/jobs', methods=['POST'])
def create_scraper_job():
    try:
        data = request.get_json(silent=True) or {}
        requested_by = data.get('requested_by')
        product_ids = _validate_active_product_ids(_parse_product_ids(data.get('product_ids')))

        job, active_job = try_enqueue_job(
            get_db_connection,
            trigger_type='manual',
            requested_by=requested_by,
            target_product_ids=product_ids,
        )

        if job is None and active_job is not None:
            return jsonify({
                "error": "An active scraper job already exists",
                "job_id": active_job["id"],
                "status": active_job["status"],
            }), 409

        return jsonify({
            "job_id": job["id"],
            "status": job["status"],
        }), 201
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500


@scraper_bp.route('/api/scraper/jobs/<int:job_id>', methods=['GET'])
def get_scraper_job(job_id):
    try:
        after_log_id = _parse_after_log_id()

        job = get_job(get_db_connection, job_id)
        if job is None:
            return jsonify({"error": "Scraper job not found"}), 404

        logs = get_job_logs(get_db_connection, job_id, after_log_id=after_log_id)
        return jsonify(build_job_response(job, logs))
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500


@scraper_bp.route('/api/scraper/jobs/latest', methods=['GET'])
def get_latest_scraper_job():
    try:
        after_log_id = _parse_after_log_id()

        job = get_latest_job(get_db_connection)
        if job is None:
            return jsonify({"error": "No scraper jobs found"}), 404

        logs = get_job_logs(get_db_connection, job["id"], after_log_id=after_log_id)
        return jsonify(build_job_response(job, logs))
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500
