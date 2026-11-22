"""add is_lodging flag to stops

Marks stops where you stay overnight (hotel, campsite, ...). The itinerary
uses this flag to show lodging per night. Existing 'hotel' and 'camping'
stops are flagged; anything else is left for the user to tick.

Revision ID: 20261122_0019
Revises: 20261122_0018
Create Date: 2026-11-22

"""
from __future__ import annotations
from alembic import op

revision = '20261122_0019'
down_revision = '20261122_0018'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("ALTER TABLE stops ADD COLUMN IF NOT EXISTS is_lodging BOOLEAN NOT NULL DEFAULT FALSE")
    op.execute("UPDATE stops SET is_lodging = TRUE WHERE lower(trim(category)) IN ('hotel', 'camping')")


def downgrade() -> None:
    op.execute("ALTER TABLE stops DROP COLUMN IF EXISTS is_lodging")
