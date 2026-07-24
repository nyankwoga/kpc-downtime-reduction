# Downtime Reduction — Inuka Hackathon Stage 1 Starter Kit

**Domain B, Problem 4:** Cut operational downtime by integrating tested schedulers/APIs into
existing maintenance workflows with performance monitoring.

## Three ways to show this — pick based on what you're doing

| File | What it is | Use it for |
|---|---|---|
| `app.py` + `app_dashboard.html` | **The actual app** — a live FastAPI service. "Run pipeline" and "Run scheduler" buttons trigger the real code, live, every click. | Your live demo. This is what "build an app" means. |
| `interactive_dashboard.html` | A snapshot of one past run, baked in as data, with a replay animation. No server needed. | Backup if the live app can't be reached (wifi issues, etc.) |
| `scorecard.html` | Fully static, no interactivity. | Screenshot into your pitch deck slides. |

Start with `app.py` — see **Quick start** below to run it locally, and `DEPLOY.md` to put it on
a real URL before Friday.

## What's in here

```
generate_data.py          simulates messy raw KPC maintenance work orders
etl/
  extract.py               reads raw data
  transform.py              cleans it (dates, statuses, duplicates, impossible values)
  load.py                   idempotent load into SQLite
  quality_checks.py         9-point data quality gate
pipeline.py                orchestrates extract -> transform -> quality gate -> load
mock_ticketing_api.py      FastAPI mock of KPC's ticketing system (standing in until real access)
scheduler.py               Cron-style job: reads clean data, creates tickets via the API,
                            logs performance (latency, retries, success rate)
tests/test_pipeline.py     9 unit tests covering the cleaning + quality gate logic
.github/workflows/ci.yml   runs tests + pipeline + quality gate on every push
memo.md                    one-page problem-framing memo (Stage 1 deliverable)
requirements.txt
```

## Quick start

```bash
pip install -r requirements.txt

# 1. generate the messy raw data (or swap in a real KPC export with the same columns)
python generate_data.py

# --- Option A: run the live app (recommended) ---
uvicorn app:app --reload --port 8000
# open http://127.0.0.1:8000 -- click "Run pipeline now", then "Run scheduler now"

# --- Option B: run the pieces separately (for development/testing) ---
python pipeline.py                                    # cleans data, runs quality gate, loads DB
pytest tests/ -v                                       # 11 unit tests
uvicorn mock_ticketing_api:app --port 8000 &            # standalone ticketing API
python scheduler.py                                     # scheduler run against it
python build_interactive_dashboard.py                   # rebuilds interactive_dashboard.html
```

## What each deliverable maps to (Stage 1 rubric)

| Rubric ask | Where it lives |
|---|---|
| Clean, documented, automated ETL foundation | `pipeline.py` + `etl/` |
| Version-controlled repo with CI + data-quality gates | `.github/workflows/ci.yml` + `etl/quality_checks.py` (10 checks) |
| One-page problem-framing memo | `memo.md` (source) / `memo.pdf` (polished, submit this one) |
| 5-minute pitch | build from: problem (memo) -> pipeline demo -> scheduler run -> `scorecard.html` as your visual |
| Relevance to KPC's specific problem | `etl/insights.py` — chronic-failure asset detection, technician double-booking detection (not generic data-quality checks, genuine operational findings) |

`scorecard.html` is a standalone, self-contained visual summary of all of the above — open it in
any browser or screenshot it straight into your pitch deck.

`interactive_dashboard.html` is the live-demo version: tabbed view (quality gate / chronic assets
/ scheduler performance), a clickable chronic-asset list, and a "Replay ticket creation" button
that animates the actual latency data from your last scheduler run point by point. Data is
embedded from a real pipeline + scheduler run, not hand-typed. To refresh it with a new run:
```bash
python pipeline.py
python scheduler.py       # with the mock API running
python build_interactive_dashboard.py
```

## Results on the simulated data (sanity check)

- Pipeline: 615 raw rows -> 600 cleaned rows (15 duplicates removed, 2 impossible timestamps
  corrected) -> **9/9 quality checks passing**
- Scheduler: 273 open/overdue work orders processed -> **273/273 tickets created** (100%
  eventual success via retry logic), average latency **176.8ms**, 18 calls needed a retry
  (the mock API simulates a 5% transient failure rate to give the monitoring something real to
  catch)

## Next steps toward Stage 2 (35%, due 21 August 2026)

- Swap the mock ticketing API for real KPC system access if/when available
- Add a predictive layer: which assets are *likely* to need a ticket soon (not just reactive
  triggering on already-overdue work orders)
- Turn `monitoring_log.csv` into a dashboard (Streamlit or similar) showing downtime-hours-saved
  trend over time — this becomes your Stage 2/3 ROI evidence

## Notes

- `raw_work_orders.csv` is intentionally messy (mixed date formats, inconsistent status
  strings, missing technicians, a few data-entry errors) — this is what Stage 1 explicitly
  wants you to demonstrate cleaning, not a shortcut to avoid.
- `maintenance.db`, `*.log`, and `monitoring_log.csv` are gitignored since they're generated
  artifacts, not source — regenerate them by re-running the pipeline/scheduler.
