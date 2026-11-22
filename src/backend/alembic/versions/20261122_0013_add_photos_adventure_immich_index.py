"""unique Immich asset per adventure (photos linked from Immich to adventures)

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
    op.execute(
        """
        CREATE UNIQUE INDEX IF NOT EXISTS idx_photos_adventure_immich_asset
        ON photos (adventure_id, immich_asset_id)
        WHERE immich_asset_id IS NOT NULL
        """
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS idx_photos_adventure_immich_asset")
