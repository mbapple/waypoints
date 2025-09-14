"""extend lists match_type with osm_country and osm_state

Revision ID: 20250914_0011
Revises: 20250914_0010
Create Date: 2025-09-14

"""
from __future__ import annotations
from alembic import op

revision = '20250914_0011'
down_revision = '20250914_0010'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Relax existing constraint then add new one including new values
    # Drop old constraint (name auto-generated unknown); recreate by rewriting table constraint.
    # Easiest: create a new check constraint if not exists and drop old by scanning catalog.
    # Since we know original definition, we'll attempt drop by pattern.
    op.execute("""
    ALTER TABLE lists DROP CONSTRAINT IF EXISTS lists_match_type_check;
    ALTER TABLE lists ADD CONSTRAINT lists_match_type_check CHECK (match_type IN ('name','osm_name','osm_id','date','osm_country','osm_state'));
    """)


def downgrade() -> None:
    op.execute("""
    ALTER TABLE lists DROP CONSTRAINT IF EXISTS lists_match_type_check;
    ALTER TABLE lists ADD CONSTRAINT lists_match_type_check CHECK (match_type IN ('name','osm_name','osm_id','date'));
    """)
