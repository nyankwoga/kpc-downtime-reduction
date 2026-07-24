"""
app.py
-------
The actual "app" for Stage 1: one deployable FastAPI service combining

  - the mock KPC ticketing API (create/list/update tickets)
  - a live pipeline endpoint (runs extract -> clean -> quality gate -> load,
    for real, when the button is clicked)
  - a live scheduler endpoint (reads clean data, creates tickets with
    retry logic and performance monitoring, for real, when clicked)
  - the dashboard UI itself, served at "/"

This turns the demo from "here are some files I ran earlier" into
"click this button and watch it happen" -- which is what a mentor
means by "build an app": something running, not something read.

Run locally:
    uvicorn app:app --reload --port 8000
    open http://127.0.0.1:8000

Deploy: see DEPLOY.md
"""

import random
import time
import math
import logging
from datetime import datetime
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, HTTPException
from fastapi.responses import HTMLResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from etl.extract import extract_work_orders
from etl.transform import clean_work_orders
from etl.load import load_work_orders
from etl.quality_checks import run_quality_checks
from etl.insights import build_insight_report

logging.basicConfig(level=logging.INFO, format="%(asctime)s | %(levelname)s | %(message)s")
logger = logging.getLogger("app")

app = FastAPI(title="KPC Downtime Reduction App")

# Allow the Next.js frontend (runs on a different port during development,
# and possibly a different domain once deployed) to call this API.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------
# In-memory state (fine for a hackathon demo; a real deploy would
# use the database for all of this instead)
# ---------------------------------------------------------------
TICKETS: dict[str, dict] = {}
_next_ticket_id = 1
LATEST_QUALITY_REPORT: Optional[dict] = None
LATEST_INSIGHTS: Optional[dict] = None
LATEST_FLEET_OVERVIEW: Optional[dict] = None
LATEST_CLEAN_DF = None
MONITORING_LOG: list[dict] = []
NOTIFICATIONS: list[dict] = []


# ---------------------------------------------------------------
# Ticketing API (same behavior as mock_ticketing_api.py, now
# embedded so the scheduler can call it in-process)
# ---------------------------------------------------------------
class TicketCreate(BaseModel):
    asset_id: str
    zone: str
    priority: str
    reason: str


@app.post("/api/tickets")
def create_ticket(ticket: TicketCreate):
    global _next_ticket_id
    time.sleep(random.uniform(0.05, 0.3))
    if random.random() < 0.05:
        raise HTTPException(status_code=503, detail="Ticketing system temporarily unavailable")
    ticket_id = f"TCK-{_next_ticket_id:05d}"
    _next_ticket_id += 1
    record = {
        "ticket_id": ticket_id, "asset_id": ticket.asset_id, "zone": ticket.zone,
        "priority": ticket.priority, "reason": ticket.reason, "status": "Open",
        "created_at": datetime.utcnow().isoformat(),
    }
    TICKETS[ticket_id] = record
    return record


@app.get("/api/tickets")
def list_tickets():
    return list(TICKETS.values())


# ---------------------------------------------------------------
# Live pipeline endpoint
# ---------------------------------------------------------------
@app.post("/api/pipeline/run")
def run_pipeline_live():
    global LATEST_QUALITY_REPORT, LATEST_INSIGHTS, LATEST_CLEAN_DF
    logger.info("Pipeline run triggered via API")

    raw_df = extract_work_orders("raw_work_orders.csv")
    clean_df = clean_work_orders(raw_df)
    quality_report = run_quality_checks(clean_df)
    load_work_orders(clean_df, db_url="sqlite:///maintenance.db")
    insight_report = build_insight_report(clean_df)

    fleet_overview = {
        "total_assets": int(clean_df["asset_id"].nunique()),
        "total_work_orders": int(len(clean_df)),
        "assets_by_type": clean_df.drop_duplicates("asset_id")["asset_type"].value_counts().to_dict(),
        "assets_by_zone": clean_df.drop_duplicates("asset_id")["zone"].value_counts().to_dict(),
        "work_orders_by_status": clean_df["status"].value_counts().to_dict(),
        "open_or_overdue_count": int(clean_df["is_open_or_overdue"].sum()),
        "unassigned_technician_count": int((clean_df["technician"] == "Unassigned").sum()),
    }

    LATEST_QUALITY_REPORT = quality_report
    LATEST_INSIGHTS = insight_report
    LATEST_CLEAN_DF = clean_df
    global LATEST_FLEET_OVERVIEW
    LATEST_FLEET_OVERVIEW = fleet_overview

    return {
        "quality_report": quality_report, "insights": insight_report,
        "fleet_overview": fleet_overview, "rows_cleaned": len(clean_df),
    }


@app.get("/api/pipeline/status")
def pipeline_status():
    return {"quality_report": LATEST_QUALITY_REPORT, "insights": LATEST_INSIGHTS, "fleet_overview": LATEST_FLEET_OVERVIEW}


# ---------------------------------------------------------------
# Equipment, maintenance, and technician query endpoints
# (read the same cleaned data the pipeline already produced --
# no re-computation, just exposing what's already there)
# ---------------------------------------------------------------
def _require_pipeline_run():
    if LATEST_CLEAN_DF is None:
        raise HTTPException(status_code=400, detail="Run the pipeline first")


@app.get("/api/equipment")
def list_equipment():
    _require_pipeline_run()
    df = LATEST_CLEAN_DF
    counts = df.groupby("asset_id").size()
    rows = []
    for asset_id, group in df.groupby("asset_id"):
        rows.append({
            "asset_id": asset_id,
            "asset_type": group["asset_type"].iloc[0],
            "zone": group["zone"].iloc[0],
            "total_work_orders": int(counts[asset_id]),
            "open_or_overdue": int(group["is_open_or_overdue"].sum()),
        })
    return {"total": len(rows), "equipment": sorted(rows, key=lambda r: -r["total_work_orders"])}


@app.get("/api/maintenance")
def list_maintenance(status: Optional[str] = None, limit: int = 100):
    _require_pipeline_run()
    df = LATEST_CLEAN_DF
    if status:
        df = df[df["status"].str.lower() == status.lower()]
    cols = ["work_order_id", "asset_id", "zone", "status", "technician", "downtime_hours", "sla_hours"]
    records = df[cols].head(limit).to_dict(orient="records")
    for r in records:
        for k, v in r.items():
            if isinstance(v, float) and math.isnan(v):
                r[k] = None
    return {"total_matching": len(df), "returned": len(records), "work_orders": records}


@app.get("/api/technicians")
def list_technicians():
    _require_pipeline_run()
    df = LATEST_CLEAN_DF
    assigned = df[df["technician"] != "Unassigned"]
    rows = []
    for tech, group in assigned.groupby("technician"):
        rows.append({
            "technician": tech,
            "assigned_work_orders": len(group),
            "zones": sorted(group["zone"].unique().tolist()),
            "open_or_overdue": int(group["is_open_or_overdue"].sum()),
        })
    return {
        "total_technicians": len(rows),
        "unassigned_work_orders": int((df["technician"] == "Unassigned").sum()),
        "technicians": sorted(rows, key=lambda r: -r["assigned_work_orders"]),
    }


# ---------------------------------------------------------------
# Notifications: fired automatically for high-priority tickets
# created by the scheduler (see run_scheduler_live below), plus a
# manual trigger endpoint for testing/demo purposes.
# ---------------------------------------------------------------
class NotifyRequest(BaseModel):
    asset_id: str
    zone: str
    message: str
    severity: str = "high"


def _fire_notification(asset_id: str, zone: str, message: str, severity: str = "high"):
    NOTIFICATIONS.append({
        "asset_id": asset_id, "zone": zone, "message": message,
        "severity": severity, "sent_at": datetime.utcnow().isoformat(),
    })


@app.post("/api/notify")
def notify_manual(req: NotifyRequest):
    _fire_notification(req.asset_id, req.zone, req.message, req.severity)
    return {"status": "sent", "total_notifications": len(NOTIFICATIONS)}


@app.get("/api/notifications")
def list_notifications():
    return {"total": len(NOTIFICATIONS), "notifications": list(reversed(NOTIFICATIONS))}


# ---------------------------------------------------------------
# Live scheduler endpoint
# ---------------------------------------------------------------
def _decide_priority(row: dict) -> str:
    if row["status"] == "Overdue":
        return "high"
    sla = row.get("sla_hours") or 0
    if sla and sla < 12:
        return "high"
    elif sla and sla < 36:
        return "medium"
    return "low"


@app.post("/api/scheduler/run")
def run_scheduler_live():
    global MONITORING_LOG
    if LATEST_CLEAN_DF is None:
        raise HTTPException(status_code=400, detail="Run the pipeline first")

    logger.info("Scheduler run triggered via API")
    run_ts = datetime.utcnow().isoformat()
    candidates = LATEST_CLEAN_DF[LATEST_CLEAN_DF["is_open_or_overdue"] == True]

    results = []
    for _, row in candidates.iterrows():
        priority = _decide_priority(row)
        payload = TicketCreate(
            asset_id=row["asset_id"], zone=row["zone"], priority=priority,
            reason=f"Auto-generated from work order {row['work_order_id']} (status: {row['status']})",
        )
        last_error, ticket_id, success, latency_ms, attempt = None, None, False, 0, 0
        for attempt in range(1, 4):
            start = time.perf_counter()
            try:
                record = create_ticket(payload)
                latency_ms = round((time.perf_counter() - start) * 1000, 1)
                success, ticket_id = True, record["ticket_id"]
                break
            except HTTPException as e:
                latency_ms = round((time.perf_counter() - start) * 1000, 1)
                last_error = str(e.detail)

        results.append({
            "run_timestamp": run_ts, "work_order_id": row["work_order_id"], "asset_id": row["asset_id"],
            "zone": row["zone"], "priority": priority, "success": success, "latency_ms": latency_ms,
            "attempts": attempt, "ticket_id": ticket_id, "error": last_error,
        })

        if success and priority == "high":
            _fire_notification(
                asset_id=row["asset_id"], zone=row["zone"],
                message=f"High-priority ticket {ticket_id} created for {row['asset_id']} (work order {row['work_order_id']})",
                severity="high",
            )

    MONITORING_LOG = results  # keep only the latest run for the demo

    n_success = sum(r["success"] for r in results)
    avg_latency = round(sum(r["latency_ms"] for r in results) / len(results), 1) if results else 0
    return {
        "total_candidates": len(results), "succeeded": n_success, "failed": len(results) - n_success,
        "avg_latency_ms": avg_latency, "tickets": results,
    }


@app.get("/api/scheduler/latest")
def scheduler_latest():
    return {"tickets": MONITORING_LOG}


@app.get("/api/health")
def health():
    return {"status": "ok", "ticket_count": len(TICKETS)}


# ---------------------------------------------------------------
# Serve the dashboard UI at "/"
# ---------------------------------------------------------------
@app.get("/", response_class=HTMLResponse)
def dashboard():
    html_path = Path(__file__).parent / "app_dashboard.html"
    return html_path.read_text(encoding="utf-8")
