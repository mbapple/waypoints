"""add invisible flag to nodes

Revision ID: 20250816_0003
Revises: 20250814_0002
Create Date: 2025-08-16

"""
from __future__ import annotations
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '20250816_0003'
down_revision = '20250814_0002'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add a boolean flag to control whether a node is shown on the map
    op.add_column(
        'nodes',
        sa.Column('invisible', sa.Boolean(), nullable=True, server_default=sa.text('false'))
    )



def downgrade() -> None:
    op.drop_column('nodes', 'invisible')
