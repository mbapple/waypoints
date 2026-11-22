"""Connection to the postgres database, used by the router files."""
import psycopg2
from psycopg2.extras import RealDictCursor

import config


def get_db():
    return psycopg2.connect(
        host=config.DB_HOST,
        port=config.DB_PORT,
        database=config.DB_NAME,
        user=config.DB_USER,
        password=config.DB_PASS,
        cursor_factory=RealDictCursor,
    )
