"""etl/transform.py — cleans raw KPC maintenance work-order data.

Handles the messiness typical of real ticketing exports:
  - multiple date formats -> single ISO datetime
  - inconsistent status strings -> canonical set
  - inconsistent zone casing -> title case
  - duplicate work orders -> deduplicated on work_order_id
  - missing technician -> 'Unassigned'
  - implausible downtime values (negative, absurdly large) -> flagged and nulled,
    with a recomputed value from reported/completed timestamps where possible
"""

import logging
import numpy as np
import pandas as pd

logger = logging.getLogger(__name__)

STATUS_MAP = {
    "open": "Open", "opened": "Open",
    "in progress": "In Progress", "in-progress": "In Progress",
    "completed": "Completed", "complete": "Completed", "closed": "Completed",
    "overdue": "Overdue", "past due": "Overdue",
}

DATE_FORMATS = ["%Y-%m-%d %H:%M", "%d/%m/%Y %H:%M", "%m-%d-%Y %H:%M"]


def _parse_flexible_date(value):
    if pd.isna(value):
        return pd.NaT
    for fmt in DATE_FORMATS:
        try:
            return pd.to_datetime(value, format=fmt)
        except (ValueError, TypeError):
            continue
    # last resort: let pandas guess
    return pd.to_datetime(value, errors="coerce")


def clean_work_orders(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    n_start = len(df)

    # --- Deduplicate ---
    df = df.drop_duplicates(subset="work_order_id", keep="first")
    logger.info("Dropped %d duplicate work orders", n_start - len(df))

    # --- Normalize text fields ---
    df["zone"] = df["zone"].str.strip().str.title()
    df["status_raw"] = df["status"]
    df["status"] = df["status"].str.strip().str.lower().map(STATUS_MAP).fillna("Unknown")
    df["technician"] = df["technician"].fillna("Unassigned")

    # --- Parse dates ---
    for col in ["reported_time", "scheduled_time", "completed_time"]:
        df[col] = df[col].apply(_parse_flexible_date)

    # --- Fix impossible timestamps: completed before reported is a data-entry error ---
    impossible_dates = df["completed_time"].notna() & (df["completed_time"] < df["reported_time"])
    n_impossible = int(impossible_dates.sum())
    if n_impossible:
        logger.warning("Found %d rows where completed_time precedes reported_time -- nulling as data-entry errors", n_impossible)
        df.loc[impossible_dates, "completed_time"] = pd.NaT
    df.attrs["n_impossible_dates_corrected"] = n_impossible

    # --- Validate / recompute downtime_hours ---
    recomputed = (df["completed_time"] - df["reported_time"]).dt.total_seconds() / 3600
    implausible = (df["downtime_hours"] < 0) | (df["downtime_hours"] > 200)
    df["downtime_flagged"] = implausible.fillna(False)
    df.loc[implausible, "downtime_hours"] = np.nan
    # fill nulls where we can recompute from valid timestamps
    can_recompute = df["downtime_hours"].isna() & recomputed.notna() & (recomputed >= 0)
    df.loc[can_recompute, "downtime_hours"] = recomputed[can_recompute].round(1)

    # --- Derived fields useful for the scheduler / dashboard ---
    df["sla_hours"] = (df["scheduled_time"] - df["reported_time"]).dt.total_seconds() / 3600
    df["completed_late"] = (
        df["completed_time"].notna()
        & df["scheduled_time"].notna()
        & (df["completed_time"] > df["scheduled_time"])
    )
    df["is_open_or_overdue"] = df["status"].isin(["Open", "In Progress", "Overdue"])

    # --- Drop rows with no asset_id or no reported_time -- unusable records ---
    before = len(df)
    df = df.dropna(subset=["asset_id", "reported_time"])
    logger.info("Dropped %d unusable rows (missing asset_id or reported_time)", before - len(df))

    logger.info("Cleaned dataset: %d rows (from %d raw rows)", len(df), n_start)
    return df.reset_index(drop=True)
