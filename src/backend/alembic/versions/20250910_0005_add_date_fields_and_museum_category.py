"""add date fields to stops and add museum to stop categories

Revision ID: 20250910_0005
Revises: 20250907_0004
Create Date: 2025-09-10

"""
from __future__ import annotations
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '20250910_0005'
down_revision = '20250907_0004'
branch_labels = None
depends_on = None

def upgrade() -> None:
    # Add a single date field to stops (nullable)
    op.add_column('stops', sa.Column('date', sa.Date(), nullable=True))
    # Add 'museum' to stop category constraint
    op.execute(
        """
        ALTER TABLE stops
        DROP CONSTRAINT IF EXISTS stops_category_check;
        ALTER TABLE stops
        ADD CONSTRAINT stops_category_check
        CHECK (category IN ('hotel', 'restaurant', 'attraction', 'park', 'museum', 'other'));
        """
    )

def downgrade() -> None:
    # Remove date field
    op.drop_column('stops', 'date')
    # Remove 'museum' from stop category constraint
    op.execute(
        """
        ALTER TABLE stops
        DROP CONSTRAINT IF EXISTS stops_category_check;
        ALTER TABLE stops
        ADD CONSTRAINT stops_category_check
        CHECK (category IN ('hotel', 'restaurant', 'attraction', 'park', 'other'));
        """
    )
