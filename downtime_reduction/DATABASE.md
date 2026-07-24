# Database Setup: SQLite (default) or MySQL

**Short version: you don't need MySQL for this hackathon.** The pipeline defaults to SQLite,
which needs zero setup — it's just a file (`maintenance.db`) created automatically the first
time you run `python pipeline.py`. Skip the rest of this doc unless your team has a specific
reason to use MySQL (existing infra, judge/mentor expectation, or you want to mirror KPC's
likely real production stack for the Stage 3 story).

## Using SQLite (default, recommended)

Nothing to do. Just run:
```bash
python pipeline.py
python scheduler.py
```
`maintenance.db` appears in your project folder. Delete it any time to reset — the pipeline
recreates it fresh on every run (that's what "idempotent load" means).

## Switching to MySQL

The codebase already supports this — every script reads a `DB_URL` environment variable, and
falls back to SQLite if it's not set. No code changes needed.

### 1. Install and start MySQL

**Option A — local install (Ubuntu/Debian):**
```bash
sudo apt update
sudo apt install mysql-server
sudo systemctl start mysql
sudo mysql_secure_installation   # set a root password when prompted
```

**Option B — Docker (no install, easiest to tear down):**
```bash
docker run --name kpc-mysql -e MYSQL_ROOT_PASSWORD=yourpassword \
  -e MYSQL_DATABASE=kpc_maintenance -p 3306:3306 -d mysql:8
```

**Option C — hosted free tier (no local setup at all):**
Services like Railway, PlanetScale, or Aiven offer free MySQL instances you can spin up in a
browser and get a connection string immediately — good if your laptop can't run Docker or a
local server.

### 2. Create the database (skip if using Docker Option B, which creates it automatically)
```bash
mysql -u root -p -e "CREATE DATABASE kpc_maintenance;"
```

### 3. Set DB_URL and run the pipeline
```bash
export DB_URL="mysql+pymysql://root:yourpassword@localhost:3306/kpc_maintenance"
pip install -r requirements.txt   # now includes sqlalchemy + pymysql
python pipeline.py
python scheduler.py
```

That's the entire switch. `pipeline.py`, `scheduler.py`, and `etl/load.py` all read `DB_URL`
the same way, so this works identically whether MySQL is local, in Docker, or hosted.

### 4. Verify it worked
```bash
mysql -u root -p kpc_maintenance -e "SELECT COUNT(*) FROM work_orders;"
```
Should show 600 (the cleaned row count).

### For the CI pipeline (.github/workflows/ci.yml)

If you want CI to test against MySQL instead of SQLite, add a MySQL service container to the
workflow and set `DB_URL` as an environment variable in the job. This is extra setup complexity
that most hackathon judges won't check for — only worth doing if MySQL is core to your pitch.

## Which should you actually pick?

| | SQLite | MySQL |
|---|---|---|
| Setup time | 0 minutes | 10-30 minutes |
| Good for | Hackathon demo, single-machine | Multi-user production, matches real KPC infra |
| Risk during demo | Very low | A server that could fail to start/connect live |
| What judges see | A clean, working pipeline | Same clean pipeline, plus infra complexity |

Unless a specific requirement pushes you toward MySQL, SQLite gets you the same rubric points
with far less risk in the 3 days you have.
