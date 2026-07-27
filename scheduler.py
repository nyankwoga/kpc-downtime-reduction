"""
scheduler.py
-------------
Simulates the Cron-triggered scheduler for Downtime Reduction (Problem 4):
"integrating tested schedulers/APIs into existing maintenance workflows
with performance monitoring."

What it does each run:
  1. Reads the cleaned work_orders table from maintenance.db
  2. Applies a rule set to decide which assets need a ticket raised
     right now (open/overdue work orders past their SLA window)
  3. Calls the mock ticketing API to create a ticket for each,
     with retry-on-failure logic
  4. Logs every call's outcome + latency to monitoring_log.csv --
     this is the "performance monitoring" deliverable: a running
     record you can chart (success rate, latency trend, tickets/run)

Run once manually:
    python scheduler.py

Run on a real cadence (e.g. every 15 min), add to crontab:
    */15 * * * * cd /path/to/project && /usr/bin/python3 scheduler.py >> scheduler_cron.log 2>&1
"""

import csv
import logging
import os
import sys
import time
from datetime import datetime

import requests
from sqlalchemy import create_engine, text

API_BASE = os.environ.get("TICKETING_API_BASE", "http://127.0.0.1:8000")
DB_URL = os.environ.get("DB_URL", "sqlite:///maintenance.db")
MONITOR_LOG = "monitoring_log.csv"
MAX_RETRIES = 2

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | scheduler | %(message)s",
    handlers=[logging.FileHandler("scheduler.log"), logging.StreamHandler(sys.stdout)],
)
logger = logging.getLogger("scheduler")


def get_candidate_work_orders(db_url: str = DB_URL):
    engine = create_engine(db_url)
    try:
        with engine.connect() as conn:
            result = conn.execute(text("""
                SELECT work_order_id, asset_id, zone, status, sla_hours, downtime_hours
                FROM work_orders
                WHERE is_open_or_overdue = 1
            """))
            return [dict(row._mapping) for row in result]
    finally:
        engine.dispose()


def decide_priority(row: dict) -> str:
    if row["status"] == "Overdue":
        return "high"
    sla = row.get("sla_hours") or 0
    if sla and sla < 12:
        return "high"
    elif sla and sla < 36:
        return "medium"
    return "low"


def create_ticket_with_retry(payload: dict) -> dict:
    last_error = None
    for attempt in range(1, MAX_RETRIES + 2):
        start = time.perf_counter()
        try:
            resp = requests.post(f"{API_BASE}/tickets", json=payload, timeout=5)
            latency_ms = (time.perf_counter() - start) * 1000
            if resp.status_code == 200:
                return {"success": True, "latency_ms": round(latency_ms, 1), "attempt": attempt,
                         "ticket_id": resp.json().get("ticket_id"), "error": None}
            last_error = f"HTTP {resp.status_code}: {resp.text[:100]}"
        except requests.RequestException as e:
            latency_ms = (time.perf_counter() - start) * 1000
            last_error = str(e)
        logger.warning("Attempt %d failed for asset %s: %s", attempt, payload["asset_id"], last_error)
    return {"success": False, "latency_ms": round(latency_ms, 1), "attempt": attempt,
             "ticket_id": None, "error": last_error}


def append_monitoring_log(records: list):
    file_exists = os.path.isfile(MONITOR_LOG)
    with open(MONITOR_LOG, "a", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=[
            "run_timestamp", "work_order_id", "asset_id", "zone", "priority",
            "success", "latency_ms", "attempts", "ticket_id", "error"
        ])
        if not file_exists:
            writer.writeheader()
        writer.writerows(records)


def run_scheduler():
    run_ts = datetime.utcnow().isoformat()
    logger.info("=== Scheduler run started (%s) ===", run_ts)

    candidates = get_candidate_work_orders()
    logger.info("Found %d open/overdue work orders needing a ticket", len(candidates))

    results = []
    for row in candidates:
        priority = decide_priority(row)
        payload = {
            "asset_id": row["asset_id"],
            "zone": row["zone"],
            "priority": priority,
            "reason": f"Auto-generated from work order {row['work_order_id']} (status: {row['status']})",
        }
        outcome = create_ticket_with_retry(payload)
        results.append({
            "run_timestamp": run_ts,
            "work_order_id": row["work_order_id"],
            "asset_id": row["asset_id"],
            "zone": row["zone"],
            "priority": priority,
            "success": outcome["success"],
            "latency_ms": outcome["latency_ms"],
            "attempts": outcome["attempt"],
            "ticket_id": outcome["ticket_id"],
            "error": outcome["error"],
        })

    if results:
        append_monitoring_log(results)

    n_success = sum(r["success"] for r in results)
    n_fail = len(results) - n_success
    avg_latency = round(sum(r["latency_ms"] for r in results) / len(results), 1) if results else 0

    logger.info(
        "=== Scheduler run complete: %d tickets created, %d failed, avg latency %.1fms ===",
        n_success, n_fail, avg_latency
    )
    return {"created": n_success, "failed": n_fail, "avg_latency_ms": avg_latency, "total_candidates": len(candidates)}


if __name__ == "__main__":
    summary = run_scheduler()
    print(summary)
