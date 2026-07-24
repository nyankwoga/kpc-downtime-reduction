"""etl/quality_checks.py — data quality gate for the cleaned work orders.

Deliberately dependency-light (no Great Expectations install needed for
the hackathon judges to reproduce results quickly) but structured the
same way: named expectations, each pass/fail, aggregated into a report.
Swap in Great Expectations later if you want the heavier suite --
the check functions below map 1:1 to GX expectation types.
"""

import logging
import pandas as pd

logger = logging.getLogger(__name__)

VALID_STATUSES = {"Open", "In Progress", "Completed", "Overdue"}
VALID_ZONES = {"Mombasa", "Nairobi", "Kisumu"}


def _count_technician_double_bookings(df: pd.DataFrame) -> int:
    """A technician can't physically work two jobs at once. This checks for
    overlapping time windows (reported_time -> completed_time, or scheduled_time
    if not yet completed) assigned to the same technician -- a real scheduling
    conflict, not just a formatting issue. Directly relevant to KPC's downtime
    problem: double-booked technicians mean one of the two jobs is delayed."""
    conflicts = 0
    assigned = df[df["technician"] != "Unassigned"].copy()
    assigned["window_end"] = assigned["completed_time"].fillna(assigned["scheduled_time"])
    assigned = assigned.dropna(subset=["reported_time", "window_end"])

    for _, group in assigned.groupby("technician"):
        intervals = sorted(zip(group["reported_time"], group["window_end"]))
        for i in range(1, len(intervals)):
            prev_start, prev_end = intervals[i - 1]
            cur_start, cur_end = intervals[i]
            if cur_start < prev_end:
                conflicts += 1
    return conflicts


def run_quality_checks(df: pd.DataFrame) -> dict:
    checks = {}

    checks["no_null_asset_id"] = bool(df["asset_id"].notna().all())
    checks["no_null_reported_time"] = bool(df["reported_time"].notna().all())
    checks["work_order_id_unique"] = bool(df["work_order_id"].is_unique)
    checks["status_in_valid_set"] = bool(df["status"].isin(VALID_STATUSES | {"Unknown"}).all())
    checks["zone_in_valid_set"] = bool(df["zone"].isin(VALID_ZONES).all())
    checks["downtime_non_negative"] = bool((df["downtime_hours"].dropna() >= 0).all())
    checks["downtime_within_bounds"] = bool((df["downtime_hours"].dropna() <= 200).all())
    checks["completed_time_after_reported"] = bool(
        (df.loc[df["completed_time"].notna(), "completed_time"] >=
         df.loc[df["completed_time"].notna(), "reported_time"]).all()
    )
    checks["unknown_status_rate_below_5pct"] = bool((df["status"] == "Unknown").mean() < 0.05)

    n_conflicts = _count_technician_double_bookings(df)
    conflict_rate = n_conflicts / max(len(df), 1)
    checks["technician_double_booking_rate_below_2pct"] = bool(conflict_rate < 0.02)

    passed = sum(checks.values())
    total = len(checks)

    report = {
        "checks": checks,
        "passed": passed,
        "total": total,
        "pass_rate": round(passed / total, 3),
        "gate_status": "PASS" if passed == total else "FAIL",
        "technician_double_bookings_found": n_conflicts,
    }

    for name, result in checks.items():
        level = logging.INFO if result else logging.WARNING
        logger.log(level, "Quality check [%s]: %s", name, "PASS" if result else "FAIL")

    logger.info("Data quality gate: %s (%d/%d checks passed)", report["gate_status"], passed, total)
    return report
