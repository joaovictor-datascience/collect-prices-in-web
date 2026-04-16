import os
import time
import traceback
from functools import partial

from app.database import create_tables, get_connection, get_products_to_scrape, save_result
from app.runner import RunSummary, run
from shared.scraper_jobs import (
    FAILED,
    SCHEDULED,
    append_job_log,
    claim_pending_job,
    finalize_job,
    get_job,
    try_enqueue_job,
    update_job_progress,
)

POLL_INTERVAL_SECONDS = float(os.getenv("SCRAPER_WORKER_POLL_SECONDS", "5"))


class JobRecorder:
    def __init__(self, job_id):
        self.job_id = job_id

    def log(
        self,
        *,
        level,
        event_type,
        message,
        product_name=None,
        url=None,
        store_name=None,
        details=None,
    ):
        return append_job_log(
            get_connection,
            self.job_id,
            level=level,
            event_type=event_type,
            message=message,
            product_name=product_name,
            url=url,
            store_name=store_name,
            details=details,
        )

    def sync_summary(self, summary):
        return update_job_progress(get_connection, self.job_id, summary.as_dict())


def enqueue_job(*, trigger_type=SCHEDULED, requested_by=None, target_product_ids=None):
    create_tables()
    return try_enqueue_job(
        get_connection,
        trigger_type=trigger_type,
        requested_by=requested_by,
        target_product_ids=target_product_ids,
    )


def claim_next_job():
    return claim_pending_job(get_connection)


def execute_job(
    job_id,
    *,
    products_loader=get_products_to_scrape,
    result_saver=save_result,
    runner=run,
    target_product_ids=None,
):
    create_tables()

    summary = RunSummary()
    recorder = JobRecorder(job_id)
    scoped_products_loader = products_loader

    if target_product_ids is None and products_loader is get_products_to_scrape:
        job = get_job(get_connection, job_id)
        if job is not None:
            target_product_ids = job.get("target_product_ids")

    if target_product_ids is not None:
        scoped_products_loader = partial(products_loader, product_ids=target_product_ids)

    try:
        runner(
            scoped_products_loader,
            summary=summary,
            log_event=recorder.log,
            sync_summary=recorder.sync_summary,
            save_result=result_saver,
        )
        return finalize_job(
            get_connection,
            job_id,
            status=summary.final_status(),
            summary=summary.as_dict(),
        )
    except Exception as exc:
        fatal_details = summary.as_dict()
        fatal_details.update({
            "exception_class": exc.__class__.__name__,
            "exception_message": str(exc),
            "traceback": traceback.format_exc(),
        })

        recorder.log(
            level="error",
            event_type="job_failed",
            message="Scraper job failed fatally",
            details=fatal_details,
        )
        return finalize_job(
            get_connection,
            job_id,
            status=FAILED,
            summary=summary.as_dict(),
            error_message=str(exc),
        )


def worker_loop(*, poll_interval=POLL_INTERVAL_SECONDS):
    create_tables()

    while True:
        job = claim_next_job()
        if job is None:
            time.sleep(poll_interval)
            continue

        execute_job(job["id"], target_product_ids=job.get("target_product_ids"))
