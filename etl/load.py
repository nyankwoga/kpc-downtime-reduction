"""etl/load.py — idempotent load of cleaned work orders into a database.

Defaults to SQLite (zero setup, single file, fine for the hackathon).
Set the DB_URL environment variable to switch to MySQL or Postgres --
no other code changes needed.

Examples of DB_URL:
    sqlite:///maintenance.db                                  (default)
    mysql+pymysql://user:password@localhost:3306/kpc_maintenance
    postgresql+psycopg2://user:password@localhost:5432/kpc_maintenance
"""

import logging
import os
import pandas as pd
from sqlalchemy import create_engine

logger = logging.getLogger(__name__)

DEFAULT_DB_URL = "sqlite:///maintenance.db"


def get_engine(db_url: str = None):
    db_url = db_url or os.environ.get("DB_URL", DEFAULT_DB_URL)
    return create_engine(db_url)


def load_work_orders(df: pd.DataFrame, db_url: str = None, table: str = "work_orders") -> None:
    engine = get_engine(db_url)
    try:
        df.to_sql(table, engine, if_exists="replace", index=False)
        logger.info("Loaded %d rows into %s (%s)", len(df), table, engine.url)
    finally:
        engine.dispose()
