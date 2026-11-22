"""add immich_asset_id to photos for photos linked from Immich

Revision ID: 20261122_0012
Revises: 20250914_0011
Create Date: 2026-11-22

"""
from __future__ import annotations
from alembic import op

revision = '20261122_0012'
down_revision = '20250914_0011'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("ALTER TABLE photos ADD COLUMN IF NOT EXISTS immich_asset_id TEXT")
    # One link per Immich asset per trip
    op.execute(
        """
        CREATE UNIQUE INDEX IF NOT EXISTS idx_photos_trip_immich_asset
        ON photos (trip_id, immich_asset_id)
        WHERE immich_asset_id IS NOT NULL
        """
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS idx_photos_trip_immich_asset")
    op.execute("ALTER TABLE photos DROP COLUMN IF EXISTS immich_asset_id")
