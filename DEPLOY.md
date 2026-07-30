# Deploying the App

This project is **two separate services** that need to be deployed separately and then
connected:

1. **Backend** (`app.py`) — a FastAPI service: the ETL pipeline, the scheduler, and the
   ticketing API.
2. **Frontend** (`frontend-interface/`) — the Next.js dashboard that calls the backend.

Recommended combo, both free, both deploy straight from GitHub:
**Render** for the backend + **Vercel** for the frontend.

## Prerequisites
- The project is pushed to GitHub, backend and frontend in the same repo (as it is now)
- `raw_work_orders.csv` is committed (it's the app's data source) — not excluded by `.gitignore`

---

## Step 1 — Deploy the backend on Render

1. Go to **render.com**, sign in with GitHub
2. Click **New +** → **Web Service** → connect your repo
3. Fill in:
   - **Root directory:** leave blank (repo root, where `app.py` lives)
   - **Runtime:** Python 3
   - **Build command:** `pip install -r requirements.txt`
   - **Start command:** `uvicorn app:app --host 0.0.0.0 --port $PORT`
   - **Instance type:** Free
4. **Don't deploy yet** — add one environment variable first (Render lets you add env vars
   before the first deploy, or redeploy after): see Step 3 below, then click **Create Web
   Service**

You'll get a URL like `https://kpc-downtime-reduction.onrender.com`. That's your **backend URL**
— keep it, you need it in Step 2.

**Free tier note:** spins down after 15 minutes idle, takes ~30-50s to wake on the next request.
Open it and click "Run pipeline now" a few minutes before a demo so it's warm.

---

## Step 2 — Deploy the frontend on Vercel

1. Go to **vercel.com**, sign in with GitHub
2. Click **Add New** → **Project** → import the same repo
3. **Root Directory:** set this to `frontend-interface` (important — Vercel needs to know the
   Next.js app isn't at the repo root; there's a folder picker in the import screen)
4. Framework preset should auto-detect as **Next.js** — leave build/output settings as default
5. Under **Environment Variables**, add:
   - `NEXT_PUBLIC_API_URL` = your Render backend URL from Step 1 (e.g.
     `https://kpc-downtime-reduction.onrender.com`) — no trailing slash
6. Click **Deploy**

You'll get a URL like `https://kpc-downtime-reduction.vercel.app`. That's your **frontend URL**
— the one you actually show judges.

---

## Step 3 — Connect them: tell the backend to trust the frontend

By default the backend only allows requests from `localhost` (for local development) — your
deployed frontend's domain isn't allowed to call it yet, and requests will silently fail with a
CORS error in the browser console.

Fix: on **Render**, open your backend service → **Environment** → add:
- `CORS_ORIGINS` = your Vercel frontend URL from Step 2 (e.g.
  `https://kpc-downtime-reduction.vercel.app`)
  — comma-separate multiple URLs if you have more than one (e.g. a preview URL and the
  production one)

Save — Render redeploys automatically. Do this **after** Step 2, since you need the Vercel URL
first.

---

## Testing the deployed app
1. Visit the Vercel URL — dashboard should load with metrics showing "–" (idle state)
2. Open the browser console (F12) — if you see a CORS error, double-check `CORS_ORIGINS` on
   Render exactly matches your Vercel URL (including `https://`, no trailing slash)
3. Click **Run pipeline now** — should show 10/10 quality checks and chronic assets within a
   few seconds (longer on Render's free tier if it was asleep)
4. Click **Run scheduler now** — should show real ticket counts and the latency chart animating

## What to say if a judge asks "is this really live?"
Yes — every click makes a real HTTP request from the Vercel-hosted frontend to the
Render-hosted backend, which re-runs `extract → clean → quality gate → load` and the
scheduler's `create ticket → retry on failure → log performance` logic fresh, against the
running ticketing API. Numbers vary slightly run to run (the mock API's simulated 5% failure
rate means retry counts differ) — that variation is itself evidence this isn't canned.

## Known limitations to be upfront about (if asked)
- **No persistent state between deploys:** pipeline/scheduler results live in memory on the
  Render backend, not a database — a Render restart or free-tier spin-down resets it back to
  idle. Fine for a demo; a production version would persist to the database the pipeline
  already loads into.
- **Free-tier cold starts:** the ~30-50s wake-up on Render's free tier is a hosting artifact,
  not a reflection of the pipeline's actual speed (which runs in a couple seconds once warm).