import argparse
import sys

from app.jobs import enqueue_job


def main():
    parser = argparse.ArgumentParser(description="Enqueue a scraper job")
    parser.add_argument("--trigger", choices=("manual", "scheduled"), default="scheduled")
    parser.add_argument("--requested-by", dest="requested_by")
    args = parser.parse_args()

    job, active_job = enqueue_job(trigger_type=args.trigger, requested_by=args.requested_by)

    if job is not None:
        print(f"Enqueued scraper job #{job['id']} with status {job['status']}")
        return 0

    if active_job is not None:
        print(
            f"Skipped enqueue because job #{active_job['id']} is already {active_job['status']}"
        )
        return 0

    print("Unable to enqueue a scraper job", file=sys.stderr)
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
