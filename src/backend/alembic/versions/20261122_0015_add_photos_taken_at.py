"""photos.taken_at: local capture time, used to place photos on calendar days

Set from Immich's localDateTime when a photo is linked and from EXIF when a
JPEG is uploaded. Existing rows are backfilled lazily by the calendar endpoint
(routers/photos.py), since that needs Immich and the uploaded files.

Revision ID: 20261122_0015
Revises: 20261122_0014
Create Date: 2026-11-22

"""
from __future__ import annotations
from alembic import op

revision = '20261122_0015'
down_revision = '20261122_0014'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Local wall-clock time (no time zone), like trip and adventure dates
    op.execute("ALTER TABLE photos ADD COLUMN IF NOT EXISTS taken_at TIMESTAMP")
    op.execute("CREATE INDEX IF NOT EXISTS idx_photos_taken_at ON photos (taken_at)")


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS idx_photos_taken_at")
    op.execute("ALTER TABLE photos DROP COLUMN IF EXISTS taken_at")
