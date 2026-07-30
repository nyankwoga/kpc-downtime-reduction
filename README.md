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

### 1. Start the backend
From the project root:

```bash
cd downtime_reduction
pip install -r requirements.txt
python generate_data.py
uvicorn app:app --reload --port 8000
```

Open http://127.0.0.1:8000 to access the FastAPI app and its API endpoints.

### 2. Start the frontend
In a separate terminal:

```bash
cd downtime_reduction/frontend-interface
pnpm install
cp .env.example .env.local  # if an example file exists, otherwise create .env.local manually
```

Create or update .env.local with:

```env
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
```

Then start the UI:

```bash
pnpm dev
```

Open http://localhost:3000 to view the Next.js dashboard.

### 3. Optional: run the pipeline and scheduler manually
If you want to populate data outside of the UI:

```bash
python pipeline.py
pytest tests/ -v
uvicorn mock_ticketing_api:app --port 8000
python scheduler.py
python build_interactive_dashboard.py
```

## What each deliverable maps to (Stage 1 rubric)

| Rubric ask | Where it lives |
|---|---|
| Clean, documented, automated ETL foundation | `pipeline.py` + `etl/` |
| Version-controlled repo with CI + data-quality gates | `.github/workflows/ci.yml` + `etl/quality_checks.py` (10 checks) |
| One-page problem-framing memo | `memo.md` (source) / `memo.pdf` (polished, submit this one) |
| 5-minute pitch | build from: problem (memo) -> pipeline demo -> scheduler run -> `scorecard.html` as your visual |
| Relevance to KPC's specific problem | `etl/insights.py` — chronic-failure asset detection, technician double-booking detection (not generic data-quality checks, genuine operational findings) |



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
