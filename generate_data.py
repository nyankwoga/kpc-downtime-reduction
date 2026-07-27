"""
generate_data.py
-----------------
Simulates messy, realistic maintenance work-order data for KPC pipeline
assets (pumps/valves across Mombasa, Nairobi, Kisumu depots).

Deliberately injects real-world messiness so the ETL pipeline has
something genuine to clean:
  - inconsistent date formats
  - missing values (technician, completed_time, notes)
  - inconsistent status strings (case, spelling)
  - duplicate work order rows
  - a few negative/impossible downtime values (data entry errors)

Output: raw_work_orders.csv  (this is the "before" state Stage 1 must clean)
"""

import numpy as np
import pandas as pd

np.random.seed(7)

ZONES = ["Mombasa", "Nairobi", "Kisumu"]
ASSET_TYPES = ["Pump", "Valve"]
TECHNICIAN_ZONES = {
    "J. Otieno": "Mombasa", "A. Wanjiru": "Mombasa", "B. Njoroge": "Mombasa",
    "S. Mwangi": "Nairobi", "P. Kiptoo": "Nairobi", "F. Muthoni": "Nairobi",
    "R. Achieng": "Kisumu", "D. Omondi": "Kisumu",
}
UNASSIGNED_RATE = 0.32  # roughly matches the original ~195/615 missing-technician rate
STATUSES_CLEAN = ["Open", "In Progress", "Completed", "Overdue"]
STATUS_VARIANTS = {
    "Open": ["Open", "open", "OPEN", "opened"],
    "In Progress": ["In Progress", "in progress", "IN-PROGRESS", "In-Progress"],
    "Completed": ["Completed", "completed", "COMPLETE", "Complete", "Closed"],
    "Overdue": ["Overdue", "overdue", "OVERDUE", "Past Due"],
}
DATE_FORMATS = ["%Y-%m-%d %H:%M", "%d/%m/%Y %H:%M", "%m-%d-%Y %H:%M"]

assets = []
asset_id = 2000
for zone in ZONES:
    for atype in ASSET_TYPES:
        for i in range(4):
            assets.append({"asset_id": f"{atype[:1]}{asset_id}", "asset_type": atype, "zone": zone})
            asset_id += 1

N_ORDERS = 600
rows = []
date_fmts = []
start_date = pd.Timestamp("2026-04-01")

for i in range(N_ORDERS):
    asset = assets[np.random.randint(len(assets))]
    reported = start_date + pd.Timedelta(hours=int(np.random.uniform(0, 24 * 100)))

    # scheduled maintenance window
    scheduled = reported + pd.Timedelta(hours=int(np.random.uniform(4, 72)))

    status_key = np.random.choice(list(STATUS_VARIANTS.keys()), p=[0.15, 0.15, 0.55, 0.15])
    status = np.random.choice(STATUS_VARIANTS[status_key])

    completed = None
    downtime_hours = None
    if status_key == "Completed":
        # actual completion drifts around the scheduled time
        drift_hours = np.random.normal(2, 6)
        completed = scheduled + pd.Timedelta(hours=drift_hours)
        downtime_hours = round(max((completed - reported).total_seconds() / 3600, 0.5), 1)
        # inject a few data-entry errors: negative or absurd downtime
        if np.random.random() < 0.02:
            downtime_hours = round(-abs(downtime_hours), 1)
        if np.random.random() < 0.01:
            downtime_hours = round(downtime_hours * 20, 1)

    technician = None  # assigned in a separate pass below, respecting scheduling realism

    notes_pool = [
        "Routine inspection flagged vibration anomaly",
        "Pressure drop reported by depot operator",
        "Scheduled preventive maintenance",
        "Escalated from HSE early-warning alert",
        None, None,
    ]
    notes = np.random.choice(notes_pool)

    date_fmt = str(np.random.choice(DATE_FORMATS))
    date_fmts.append(date_fmt)

    rows.append({
        "work_order_id": f"WO-{10000+i}" if np.random.random() > 0.03 else f"WO-{10000+i}",  # occasional dupes injected below
        "asset_id": asset["asset_id"],
        "asset_type": asset["asset_type"],
        "zone": asset["zone"] if np.random.random() > 0.05 else asset["zone"].lower(),  # inconsistent casing
        "reported_time": reported.strftime(date_fmt),
        "scheduled_time": scheduled.strftime(date_fmt),
        "completed_time": completed.strftime(date_fmt) if completed is not None else None,
        "status": status,
        "technician": technician,
        "downtime_hours": downtime_hours,
        "notes": notes,
    })

df = pd.DataFrame(rows)
df["_date_fmt"] = date_fmts  # exact format each row was written in, avoids ambiguous mixed-parsing

# --- Assign technicians: zone-scoped, availability-aware, so double-booking
# is rare and realistic rather than an artifact of pure randomness. A small
# number of genuine conflicts are injected afterward so the data-quality
# check has real signal to detect. ---
df["_reported_dt"] = [
    pd.to_datetime(v, format=f) for v, f in zip(df["reported_time"], df["_date_fmt"])
]
df["_window_end_dt"] = [
    pd.to_datetime(c, format=f) if pd.notna(c) else pd.to_datetime(s, format=f)
    for c, s, f in zip(df["completed_time"], df["scheduled_time"], df["_date_fmt"])
]

technician_busy_until = {name: pd.Timestamp.min for name in TECHNICIAN_ZONES}
assigned_technicians = [None] * len(df)

for idx in df.sort_values("_reported_dt").index:
    if np.random.random() < UNASSIGNED_RATE:
        continue  # left as None -> "Unassigned" after cleaning
    zone = df.at[idx, "zone"]
    # match on title-cased zone name regardless of the casing noise already injected
    candidates = [t for t, z in TECHNICIAN_ZONES.items() if z.lower() == str(zone).lower()]
    if not candidates:
        continue
    start = df.at[idx, "_reported_dt"]
    end = df.at[idx, "_window_end_dt"]
    free = [t for t in candidates if technician_busy_until[t] <= start]
    if not free:
        continue  # no one available -- leave unassigned rather than forcing a fake conflict
    chosen = np.random.choice(free)
    technician_busy_until[chosen] = end if pd.notna(end) else start + pd.Timedelta(hours=8)
    assigned_technicians[idx] = chosen

df["technician"] = assigned_technicians
df = df.drop(columns=["_date_fmt", "_reported_dt", "_window_end_dt"])

# Deliberately inject a handful of genuine double-bookings (data-entry style
# errors: two jobs assigned to the same technician despite scheduling logic)
# so the quality check has real conflicts to catch -- not zero, not rampant.
assigned_rows = df[df["technician"].notna()].index.tolist()
if len(assigned_rows) >= 6:
    conflict_pairs = np.random.choice(assigned_rows, size=6, replace=False)
    for i in range(0, len(conflict_pairs) - 1, 2):
        df.at[conflict_pairs[i + 1], "technician"] = df.at[conflict_pairs[i], "technician"]

# Inject ~15 duplicate rows (common in real ticketing exports)
dupes = df.sample(15, random_state=7)
df = pd.concat([df, dupes], ignore_index=True)

# Shuffle so duplicates aren't neatly grouped
df = df.sample(frac=1, random_state=7).reset_index(drop=True)

df.to_csv("raw_work_orders.csv", index=False)
print(f"Generated {len(df)} raw work order rows (messy, includes duplicates/nulls/format issues)")
print(f"Status value variants present: {df['status'].nunique()} distinct strings")
print(f"Missing technician: {df['technician'].isna().sum()} rows")
print(f"Missing completed_time: {df['completed_time'].isna().sum()} rows")
