"""add geography points for nodes and stops and populate

Revision ID: 20250814_0001
Revises: 
Create Date: 2025-08-14

"""
from __future__ import annotations
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '20250814_0001'
down_revision = '20250814_0000'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Initial schema provides geog columns; here we backfill values and ensure indexes
    op.execute(
        """
        UPDATE nodes
        SET geog = CASE
            WHEN latitude IS NOT NULL AND longitude IS NOT NULL THEN
                ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography
            ELSE NULL
        END
        """
    )
    op.execute(
        """
        UPDATE stops
        SET geog = CASE
            WHEN latitude IS NOT NULL AND longitude IS NOT NULL THEN
                ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography
            ELSE NULL
        END
        """
    )
    # Indexes (idempotent)
    op.execute("CREATE INDEX IF NOT EXISTS idx_nodes_geog ON nodes USING GIST (geog)")
    op.execute("CREATE INDEX IF NOT EXISTS idx_stops_geog ON stops USING GIST (geog)")
    op.execute("CREATE INDEX IF NOT EXISTS idx_nodes_trip_id ON nodes(trip_id)")
    op.execute("CREATE INDEX IF NOT EXISTS idx_legs_trip_id ON legs(trip_id)")
    op.execute("CREATE INDEX IF NOT EXISTS idx_legs_start_node_id ON legs(start_node_id)")
    op.execute("CREATE INDEX IF NOT EXISTS idx_legs_end_node_id ON legs(end_node_id)")


def downgrade() -> None:
    # Drop indexes
    op.execute("DROP INDEX IF EXISTS idx_nodes_geog")
    op.execute("DROP INDEX IF EXISTS idx_stops_geog")
    op.execute("DROP INDEX IF EXISTS idx_nodes_trip_id")
    op.execute("DROP INDEX IF EXISTS idx_legs_trip_id")
    op.execute("DROP INDEX IF EXISTS idx_legs_start_node_id")
    op.execute("DROP INDEX IF EXISTS idx_legs_end_node_id")
    op.execute("DROP INDEX IF EXISTS idx_stops_trip_id")
    op.execute("DROP INDEX IF EXISTS idx_stops_leg_id")
    op.execute("DROP INDEX IF EXISTS idx_stops_node_id")

    # Drop columns (safe if exist)
    op.execute(
        """
        DO $$
        BEGIN
            IF EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name='nodes' AND column_name='geog'
            ) THEN
                ALTER TABLE nodes DROP COLUMN geog;
            END IF;
            IF EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name='stops' AND column_name='geog'
            ) THEN
                ALTER TABLE stops DROP COLUMN geog;
            END IF;
        END
        $$;
        """
    )
