"""tests/test_pipeline.py — unit tests for the transform + quality gate logic.

Run: pytest tests/ -v
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pandas as pd
import pytest

from etl.transform import clean_work_orders, _parse_flexible_date
from etl.quality_checks import run_quality_checks


def make_raw_df(overrides=None):
    """A minimal valid raw row, with optional field overrides for testing edge cases."""
    row = {
        "work_order_id": "WO-1",
        "asset_id": "P2000",
        "asset_type": "Pump",
        "zone": "mombasa",
        "reported_time": "2026-06-01 10:00",
        "scheduled_time": "2026-06-02 10:00",
        "completed_time": "2026-06-02 12:00",
        "status": "completed",
        "technician": "J. Otieno",
        "downtime_hours": 26.0,
        "notes": "test",
    }
    if overrides:
        row.update(overrides)
    return pd.DataFrame([row])


def test_parses_multiple_date_formats():
    assert _parse_flexible_date("2026-06-01 10:00") == pd.Timestamp("2026-06-01 10:00")
    assert _parse_flexible_date("01/06/2026 10:00") == pd.Timestamp("2026-06-01 10:00")
    assert _parse_flexible_date("06-01-2026 10:00") == pd.Timestamp("2026-06-01 10:00")


def test_zone_casing_normalized():
    df = make_raw_df({"zone": "mombasa"})
    cleaned = clean_work_orders(df)
    assert cleaned.loc[0, "zone"] == "Mombasa"


def test_status_variants_map_to_canonical():
    for raw_status in ["completed", "COMPLETE", "Closed", "in progress"]:
        df = make_raw_df({"status": raw_status})
        cleaned = clean_work_orders(df)
        assert cleaned.loc[0, "status"] in {"Completed", "In Progress"}


def test_missing_technician_becomes_unassigned():
    df = make_raw_df({"technician": None})
    cleaned = clean_work_orders(df)
    assert cleaned.loc[0, "technician"] == "Unassigned"


def test_duplicate_work_orders_removed():
    df = pd.concat([make_raw_df(), make_raw_df()], ignore_index=True)
    cleaned = clean_work_orders(df)
    assert len(cleaned) == 1


def test_negative_downtime_flagged_and_nulled_then_recomputed():
    # negative downtime should be flagged; since valid timestamps exist,
    # it should be recomputed rather than left null
    df = make_raw_df({"downtime_hours": -5.0})
    cleaned = clean_work_orders(df)
    assert cleaned.loc[0, "downtime_flagged"] == True
    assert cleaned.loc[0, "downtime_hours"] > 0


def test_impossible_completed_before_reported_is_corrected():
    df = make_raw_df({
        "reported_time": "2026-06-05 10:00",
        "completed_time": "2026-06-01 10:00",  # before reported -- impossible
    })
    cleaned = clean_work_orders(df)
    assert pd.isna(cleaned.loc[0, "completed_time"])


def test_quality_gate_passes_on_clean_data():
    df = make_raw_df()
    cleaned = clean_work_orders(df)
    report = run_quality_checks(cleaned)
    assert report["gate_status"] == "PASS"
    assert report["passed"] == report["total"]


def test_quality_gate_catches_duplicate_ids():
    # simulate a scenario where dedup somehow missed a duplicate id
    # (defensive test -- checks the gate itself, not just transform)
    df = pd.concat([make_raw_df(), make_raw_df({"work_order_id": "WO-1"})], ignore_index=True)
    # bypass the dedup step to directly test the quality gate's own detection
    df["zone"] = df["zone"].str.title()
    df["status"] = "Completed"
    df["technician"] = df["technician"].fillna("Unassigned")
    for col in ["reported_time", "scheduled_time", "completed_time"]:
        df[col] = pd.to_datetime(df[col])
    df["downtime_flagged"] = False
    report = run_quality_checks(df)
    assert report["checks"]["work_order_id_unique"] is False
    assert report["gate_status"] == "FAIL"


def test_technician_double_booking_detected():
    df = pd.concat([
        make_raw_df({
            "work_order_id": "WO-1", "technician": "J. Otieno",
            "reported_time": "2026-06-01 08:00", "scheduled_time": "2026-06-01 10:00",
            "completed_time": "2026-06-01 12:00",
        }),
        make_raw_df({
            "work_order_id": "WO-2", "technician": "J. Otieno",
            "reported_time": "2026-06-01 09:00", "scheduled_time": "2026-06-01 11:00",
            "completed_time": "2026-06-01 13:00",
        }),
    ], ignore_index=True)
    cleaned = clean_work_orders(df)
    report = run_quality_checks(cleaned)
    assert report["technician_double_bookings_found"] >= 1


def test_chronic_asset_detection():
    from etl.insights import find_chronic_assets
    # asset A gets 10 tickets, assets B/C get 2 each -- A should stand out
    rows = []
    for i in range(10):
        rows.append({
            "work_order_id": f"WO-A{i}", "asset_id": "P9999", "asset_type": "Pump",
            "zone": "Mombasa", "reported_time": f"2026-0{(i % 6) + 1}-01 08:00",
            "scheduled_time": "2026-06-01 10:00", "completed_time": None,
            "status": "Open", "technician": None, "downtime_hours": None, "notes": None,
        })
    for aid in ["P0001", "P0002"]:
        for i in range(2):
            rows.append({
                "work_order_id": f"WO-{aid}-{i}", "asset_id": aid, "asset_type": "Pump",
                "zone": "Mombasa", "reported_time": "2026-06-01 08:00",
                "scheduled_time": "2026-06-01 10:00", "completed_time": None,
                "status": "Open", "technician": None, "downtime_hours": None, "notes": None,
            })
    df = pd.DataFrame(rows)
    cleaned = clean_work_orders(df)
    chronic = find_chronic_assets(cleaned, min_multiplier=1.2)
    chronic_ids = [c["asset_id"] for c in chronic]
    assert "P9999" in chronic_ids
    assert "P0001" not in chronic_ids


if __name__ == "__main__":
    sys.exit(pytest.main([__file__, "-v"]))
