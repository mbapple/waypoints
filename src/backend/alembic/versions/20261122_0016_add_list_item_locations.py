"""list_item_locations: user-linked coordinates for list items

Opt-in per list (Statistics > Link Locations). Keyed by the exact item text
from lists.items; the list map view pins items here, independent of the
node/stop that checked the item off.

Revision ID: 20261122_0016
Revises: 20261122_0015
Create Date: 2026-11-22

"""
from __future__ import annotations
from alembic import op

revision = '20261122_0016'
down_revision = '20261122_0015'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS list_item_locations (
            list_id INTEGER NOT NULL REFERENCES lists(id) ON DELETE CASCADE,
            item TEXT NOT NULL,
            latitude DOUBLE PRECISION NOT NULL,
            longitude DOUBLE PRECISION NOT NULL,
            osm_id TEXT,
            osm_name TEXT,
            osm_country TEXT,
            osm_state TEXT,
            PRIMARY KEY (list_id, item)
        )
        """
    )


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS list_item_locations")
