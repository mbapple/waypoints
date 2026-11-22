"""nodes/stops: the city each place is in (Nominatim reverse lookup, city level)

Filled by routers/cities.py when a node or stop is saved, and for existing
rows by the Settings > Visited cities backfill. Lets the Cities map view group
places by city even when their own OSM ids differ.

Revision ID: 20261122_0017
Revises: 20261122_0016
Create Date: 2026-11-22

"""
from __future__ import annotations
from alembic import op

revision = '20261122_0017'
down_revision = '20261122_0016'
branch_labels = None
depends_on = None

TABLES = ("nodes", "stops")


def upgrade() -> None:
    for t in TABLES:
        op.execute(
            f"""
            ALTER TABLE {t}
                ADD COLUMN IF NOT EXISTS osm_city TEXT,
                ADD COLUMN IF NOT EXISTS osm_city_id TEXT,
                ADD COLUMN IF NOT EXISTS osm_city_lat DOUBLE PRECISION,
                ADD COLUMN IF NOT EXISTS osm_city_lon DOUBLE PRECISION
            """
        )
        op.execute(f"CREATE INDEX IF NOT EXISTS idx_{t}_osm_city_id ON {t} (osm_city_id)")


def downgrade() -> None:
    for t in TABLES:
        op.execute(f"DROP INDEX IF EXISTS idx_{t}_osm_city_id")
        op.execute(
            f"""
            ALTER TABLE {t}
                DROP COLUMN IF EXISTS osm_city_lon,
                DROP COLUMN IF EXISTS osm_city_lat,
                DROP COLUMN IF EXISTS osm_city_id,
                DROP COLUMN IF EXISTS osm_city
            """
        )
