# Deploying the App

This turns `app.py` from "runs on my laptop" into a real URL you can show a mentor or judge from
any device. Recommended: **Render** (free tier, deploys straight from GitHub, no credit card).

## Prerequisites
- The project is already pushed to GitHub (see the earlier repo setup guide)
- `raw_work_orders.csv` must be committed to the repo (it's the app's data source) — check it's
  not accidentally excluded by `.gitignore` (it isn't, by default)

## Deploy on Render (recommended)

1. Go to **render.com**, sign in with GitHub
2. Click **New +** → **Web Service**
3. Connect your `downtime_reduction` repository
4. Fill in:
   - **Name:** `kpc-downtime-reduction` (or whatever you like — this becomes part of your URL)
   - **Runtime:** Python 3
   - **Build command:** `pip install -r requirements.txt`
   - **Start command:** `uvicorn app:app --host 0.0.0.0 --port $PORT`
   - **Instance type:** Free
5. Click **Create Web Service**

Render builds and deploys automatically — takes 2-5 minutes on first deploy. You'll get a URL
like `https://kpc-downtime-reduction.onrender.com`. Open it, click **Run pipeline now**, then
**Run scheduler now** — same behavior as running it locally, just live on the internet.

**Free tier note:** Render's free web services spin down after 15 minutes of inactivity and take
~30-50 seconds to wake back up on the next request. Open the URL and click "Run pipeline now"
a few minutes before your actual demo slot so it's already warm when judges are watching.

## Alternative: Railway
Similar flow — railway.app, "New Project" → "Deploy from GitHub repo" → it auto-detects Python
and uses your `Procfile`. Also has a free tier with different spin-down behavior; check current
limits at railway.app/pricing since these change.

## Testing the deployed app
Once live, verify the same flow you tested locally:
1. Visit the URL — dashboard should load with all four metrics showing "–" (idle state)
2. Click **Run pipeline now** — should show 10/10 quality checks and chronic assets within a
   few seconds
3. Click **Run scheduler now** — should show real ticket counts and the latency chart animating

## What to say if a judge asks "is this really live?"
Yes — unlike `scorecard.html` and `interactive_dashboard.html` (which show data from a specific
past run, embedded as JSON), `app.py` actually re-runs `extract → clean → quality gate → load`
and the scheduler's `create ticket → retry on failure → log performance` logic fresh, in real
time, against the running ticketing API — every time the buttons are clicked. The numbers will
vary slightly run to run (the mock API's simulated 5% failure rate means retry counts differ),
which is itself good demo evidence that this isn't canned.

## Known limitation to be upfront about (if asked)
State (tickets, latest quality report) lives in memory on the server, not a persistent database
— restarting the server (or Render's free-tier spin-down) resets it back to idle. Fine for a
hackathon demo; a production version would persist this to the database the ETL pipeline already
loads into.
