"""
pipeline.py
------------
Orchestrates the Stage 1 ETL pipeline for Problem 4 (Downtime Reduction):

    extract raw_work_orders.csv
        -> transform (clean_work_orders)
        -> quality gate (run_quality_checks)
        -> load into maintenance.db (SQLite)

Run:
    python pipeline.py

This is the "pipeline for the pipeline" deliverable -- run it, check
pipeline.log and the printed quality gate report, and load maintenance.db
to confirm the cleaned table exists.
"""

import logging
import sys
import json

from etl.extract import extract_work_orders
from etl.transform import clean_work_orders
from etl.load import load_work_orders
from etl.quality_checks import run_quality_checks
from etl.insights import build_insight_report

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
    handlers=[
        logging.FileHandler("pipeline.log"),
        logging.StreamHandler(sys.stdout),
    ],
)

logger = logging.getLogger("pipeline")


def run_pipeline(raw_path: str = "raw_work_orders.csv", db_url: str = None) -> dict:
    logger.info("=== Pipeline run started ===")

    raw_df = extract_work_orders(raw_path)
    clean_df = clean_work_orders(raw_df)

    quality_report = run_quality_checks(clean_df)

    if quality_report["gate_status"] == "FAIL":
        logger.warning("Quality gate FAILED -- loading data anyway for hackathon demo, "
                        "but this would block a production deploy.")

    load_work_orders(clean_df, db_url=db_url)

    insight_report = build_insight_report(clean_df)
    with open("insights.json", "w", encoding="utf-8") as f:
        json.dump(insight_report, f, indent=2)
    logger.info("Insights: %d chronic-failure assets found out of %d analyzed",
                insight_report["chronic_assets_found"], insight_report["total_assets_analyzed"])

    with open("quality_report.json", "w", encoding="utf-8") as f:
        json.dump(quality_report, f, indent=2)

    logger.info("=== Pipeline run complete ===")
    return quality_report


if __name__ == "__main__":
    report = run_pipeline()
    print(json.dumps(report, indent=2))
