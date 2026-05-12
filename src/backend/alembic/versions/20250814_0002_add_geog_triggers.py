"""add triggers to keep geog in sync for nodes and stops

Revision ID: 20250814_0002
Revises: 20250814_0001
Create Date: 2025-08-14

"""
from __future__ import annotations
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '20250814_0002'
down_revision = '20250814_0001'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        -- Function to set geog for nodes
        CREATE OR REPLACE FUNCTION set_nodes_geog() RETURNS trigger AS $$
        BEGIN
          IF NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL THEN
            NEW.geog := ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326)::geography;
          ELSE
            NEW.geog := NULL;
          END IF;
          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;

        -- Function to set geog for stops
        CREATE OR REPLACE FUNCTION set_stops_geog() RETURNS trigger AS $$
        BEGIN
          IF NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL THEN
            NEW.geog := ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326)::geography;
          ELSE
            NEW.geog := NULL;
          END IF;
          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;

        -- Triggers to keep geog in sync on insert/update of lat/lon
        DROP TRIGGER IF EXISTS trg_nodes_set_geog ON nodes;
        CREATE TRIGGER trg_nodes_set_geog
          BEFORE INSERT OR UPDATE OF latitude, longitude ON nodes
          FOR EACH ROW EXECUTE FUNCTION set_nodes_geog();

        DROP TRIGGER IF EXISTS trg_stops_set_geog ON stops;
        CREATE TRIGGER trg_stops_set_geog
          BEFORE INSERT OR UPDATE OF latitude, longitude ON stops
          FOR EACH ROW EXECUTE FUNCTION set_stops_geog();
        """
    )


def downgrade() -> None:
    op.execute(
        """
        DROP TRIGGER IF EXISTS trg_nodes_set_geog ON nodes;
        DROP TRIGGER IF EXISTS trg_stops_set_geog ON stops;
        DROP FUNCTION IF EXISTS set_nodes_geog();
        DROP FUNCTION IF EXISTS set_stops_geog();
        """
    )
