"""add lists table for flexible list matching

Revision ID: 20250914_0010
Revises: 20250913_0009
Create Date: 2025-09-14

"""
from __future__ import annotations
from alembic import op

revision = '20250914_0010'
down_revision = '20250913_0009'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create lists table
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS lists (
            id SERIAL PRIMARY KEY,
            name TEXT NOT NULL UNIQUE,
            match_type TEXT NOT NULL CHECK (match_type IN ('name','osm_name','osm_id','date')),
            items TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[], -- canonical list entries (e.g. names, osm_ids, YYYY-MM strings)
            manual_overrides TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[], -- user forced completions
            created_at TIMESTAMP DEFAULT now(),
            updated_at TIMESTAMP DEFAULT now()
        );
        """
    )

    # updated_at trigger
    op.execute(
        """
        DROP TRIGGER IF EXISTS trg_lists_set_updated_at ON lists;
        CREATE TRIGGER trg_lists_set_updated_at
          BEFORE UPDATE ON lists
          FOR EACH ROW EXECUTE FUNCTION set_updated_at();
        """
    )

    # Useful index to search items quickly
    op.execute("CREATE INDEX IF NOT EXISTS idx_lists_items_gin ON lists USING GIN (items);")
    op.execute("CREATE INDEX IF NOT EXISTS idx_lists_manual_overrides_gin ON lists USING GIN (manual_overrides);")


def downgrade() -> None:
    op.execute("DROP TRIGGER IF EXISTS trg_lists_set_updated_at ON lists;")
    op.execute("DROP TABLE IF EXISTS lists;")
