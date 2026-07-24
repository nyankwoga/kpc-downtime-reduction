"""etl/extract.py — read raw work order data from CSV (source-agnostic wrapper,
so swapping to a real KPC export or API later only touches this file)."""

import logging
import pandas as pd

logger = logging.getLogger(__name__)


def extract_work_orders(path: str = "raw_work_orders.csv") -> pd.DataFrame:
    logger.info("Extracting raw work orders from %s", path)
    df = pd.read_csv(path)
    logger.info("Extracted %d raw rows", len(df))
    return df
