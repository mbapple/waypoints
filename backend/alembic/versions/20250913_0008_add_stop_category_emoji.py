"""add emoji column to stop_categories

Revision ID: 20250913_0007
Revises: 20250913_0006
Create Date: 2025-09-13

"""
from __future__ import annotations
from alembic import op


revision = '20250913_0008'
down_revision = '20250913_0007'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add emoji column if missing
    op.execute(
        """
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'stop_categories' AND column_name = 'emoji'
            ) THEN
                ALTER TABLE stop_categories ADD COLUMN emoji TEXT;
            END IF;
        END
        $$;
        """
    )


def downgrade() -> None:
    # Drop emoji column if exists
    op.execute(
        """
        DO $$
        BEGIN
            IF EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'stop_categories' AND column_name = 'emoji'
            ) THEN
                ALTER TABLE stop_categories DROP COLUMN emoji;
            END IF;
        END
        $$;
        """
    )
