"""add recorded flight track (polyline + source) to flight_details

Revision ID: 20261122_0013
Revises: 20261122_0012
Create Date: 2026-11-22

"""
from __future__ import annotations
from alembic import op

revision = '20261122_0013'
down_revision = '20261122_0012'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Encoded polyline (Google format, 1e5 precision) of the flown track, like
    # car_details.polyline. NULL means the map draws the great-circle route.
    op.execute("ALTER TABLE flight_details ADD COLUMN IF NOT EXISTS polyline TEXT")
    # Where the track came from, e.g. 'opensky'
    op.execute("ALTER TABLE flight_details ADD COLUMN IF NOT EXISTS track_source TEXT")


def downgrade() -> None:
    op.execute("ALTER TABLE flight_details DROP COLUMN IF EXISTS track_source")
    op.execute("ALTER TABLE flight_details DROP COLUMN IF EXISTS polyline")
