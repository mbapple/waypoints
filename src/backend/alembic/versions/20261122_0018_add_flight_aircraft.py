"""add aircraft (registration, type, photo) to flight_details

Revision ID: 20261122_0018
Revises: 20261122_0017
Create Date: 2026-11-22

"""
from __future__ import annotations
from alembic import op

revision = '20261122_0018'
down_revision = '20261122_0017'
branch_labels = None
depends_on = None

COLUMNS = (
    "aircraft_icao24",         # transponder address, e.g. 4007f9
    "aircraft_registration",   # tail number, e.g. G-YMMN
    "aircraft_type",           # e.g. Boeing 777 236ER
    "aircraft_icao_type",      # ICAO type designator, e.g. B772
    "aircraft_photo",          # /uploads/aircraft/<REG>.jpg
    "aircraft_photo_credit",   # photographer
    "aircraft_photo_link",     # photo's page on its source site
)


def upgrade() -> None:
    for col in COLUMNS:
        op.execute(f"ALTER TABLE flight_details ADD COLUMN IF NOT EXISTS {col} TEXT")


def downgrade() -> None:
    for col in COLUMNS:
        op.execute(f"ALTER TABLE flight_details DROP COLUMN IF EXISTS {col}")
