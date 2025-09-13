"""rename stops.date to start_date and add end_date

Revision ID: 20250913_0007
Revises: 20250913_0006
Create Date: 2025-09-13

"""
from __future__ import annotations
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '20250913_0007'
down_revision = '20250913_0006'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Rename existing date column to start_date if it exists
    op.execute(
        """
        DO $$
        BEGIN
            IF EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name='stops' AND column_name='date'
            ) AND NOT EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name='stops' AND column_name='start_date'
            ) THEN
                ALTER TABLE stops RENAME COLUMN date TO start_date;
            END IF;
        END
        $$;
        """
    )

    # Add end_date column if not present
    op.execute(
        """
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name='stops' AND column_name='end_date'
            ) THEN
                ALTER TABLE stops ADD COLUMN end_date DATE;
            END IF;
        END
        $$;
        """
    )


def downgrade() -> None:
    # Drop end_date if exists
    op.execute(
        """
        DO $$
        BEGIN
            IF EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name='stops' AND column_name='end_date'
            ) THEN
                ALTER TABLE stops DROP COLUMN end_date;
            END IF;
        END
        $$;
        """
    )

    # Rename start_date back to date if appropriate
    op.execute(
        """
        DO $$
        BEGIN
            IF EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name='stops' AND column_name='start_date'
            ) AND NOT EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name='stops' AND column_name='date'
            ) THEN
                ALTER TABLE stops RENAME COLUMN start_date TO date;
            END IF;
        END
        $$;
        """
    )
