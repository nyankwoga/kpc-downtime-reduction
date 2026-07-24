"""
export_demo_data.py
---------------------
Bundles the pipeline's quality report, insights, and scheduler monitoring
log into one compact JSON file that the interactive HTML dashboard embeds
directly -- no server needed to view it, but the data is real (from an
actual pipeline + scheduler run, not hand-typed).

Run this after pipeline.py and scheduler.py to refresh dashboard_data.json,
then re-open interactive_dashboard.html (or re-run build unnecessary --
the HTML reads the JSON file at load time via fetch, so just refreshing
the browser picks up new data).

Actually embeds the JSON inline in the HTML for portability -- see
build_interactive_dashboard.py.
"""

import csv
import json
from datetime import datetime, timezone

with open("quality_report.json", encoding="utf-8") as f:
    quality_report = json.load(f)

with open("insights.json", encoding="utf-8") as f:
    insights = json.load(f)

with open("monitoring_log.csv", encoding="utf-8") as f:
    monitoring_rows = list(csv.DictReader(f))

# Use the most recent run only (monitoring_log.csv can accumulate across runs)
if monitoring_rows:
    latest_run_ts = max(r["run_timestamp"] for r in monitoring_rows)
    monitoring_rows = [r for r in monitoring_rows if r["run_timestamp"] == latest_run_ts]

for r in monitoring_rows:
    r["success"] = r["success"] == "True"
    r["latency_ms"] = float(r["latency_ms"])
    r["attempts"] = int(r["attempts"])

total = len(monitoring_rows)
succeeded = sum(1 for r in monitoring_rows if r["success"])
retried = sum(1 for r in monitoring_rows if r["attempts"] > 1)
avg_latency = round(sum(r["latency_ms"] for r in monitoring_rows) / total, 1) if total else 0

priority_counts = {}
for r in monitoring_rows:
    priority_counts[r["priority"]] = priority_counts.get(r["priority"], 0) + 1

zone_counts = {}
for r in monitoring_rows:
    zone_counts[r["zone"]] = zone_counts.get(r["zone"], 0) + 1

payload = {
    "quality_report": quality_report,
    "insights": insights,
    "scheduler_run": {
        "total_candidates": total,
        "succeeded": succeeded,
        "failed": total - succeeded,
        "retried": retried,
        "avg_latency_ms": avg_latency,
        "priority_breakdown": priority_counts,
        "zone_breakdown": zone_counts,
        "tickets": monitoring_rows,  # full detail for the live-feeling timeline
    },
    "exported_at": datetime.now(timezone.utc).isoformat(),
}

with open("dashboard_data.json", "w", encoding="utf-8") as f:
    json.dump(payload, f)

print(f"Exported dashboard_data.json: {total} tickets, {succeeded} succeeded, avg latency {avg_latency}ms")
