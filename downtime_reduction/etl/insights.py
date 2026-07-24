"""etl/insights.py — operational insights surfaced from the cleaned Stage 1 data.

These aren't data-quality checks (nothing here is "wrong" with the data) --
they're the kind of finding a downtime-reduction system should surface on
day one, and make good pitch evidence that the pipeline already produces
actionable signal, not just clean rows.
"""

import logging
import pandas as pd

logger = logging.getLogger(__name__)


def find_chronic_assets(df: pd.DataFrame, top_quartile: bool = True, min_multiplier: float = 1.2) -> list:
    """Flags assets with a ticket volume meaningfully above the fleet average --
    these are the assets a condition-based maintenance program should prioritize
    first, since they're already telling you they fail more often than their
    peers. Uses relative ranking rather than a fixed absolute count, so the
    result stays meaningful regardless of the fleet's overall ticket volume."""
    counts = df.groupby("asset_id").size()
    fleet_avg = counts.mean()
    threshold = fleet_avg * min_multiplier

    chronic = []
    for asset_id, count in counts.sort_values(ascending=False).items():
        if count < threshold:
            break
        group = df[df["asset_id"] == asset_id].iloc[0]
        chronic.append({
            "asset_id": asset_id,
            "zone": group["zone"],
            "asset_type": group["asset_type"],
            "ticket_count": int(count),
            "fleet_average": round(fleet_avg, 1),
            "multiplier_vs_fleet_average": round(count / fleet_avg, 2),
        })
    return chronic


def build_insight_report(df: pd.DataFrame) -> dict:
    chronic_assets = find_chronic_assets(df)
    return {
        "chronic_assets_found": len(chronic_assets),
        "chronic_assets": chronic_assets,
        "total_assets_analyzed": df["asset_id"].nunique(),
        "chronic_asset_rate": round(len(chronic_assets) / max(df["asset_id"].nunique(), 1), 3),
    }
