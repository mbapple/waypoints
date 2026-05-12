"""initial schema with postgis, tables, geog columns, and indexes

Revision ID: 20250814_0000
Revises:
Create Date: 2025-08-14

"""
from __future__ import annotations
from alembic import op


# revision identifiers, used by Alembic.
revision = '20250814_0000'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Enable PostGIS
    op.execute("CREATE EXTENSION IF NOT EXISTS postgis")

    # Core tables
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS trips (
            id SERIAL PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT,
            start_date DATE,
            end_date DATE,
            created_at TIMESTAMP DEFAULT now(),
            updated_at TIMESTAMP DEFAULT now()
        );
        """
    )

    op.execute(
        """
        CREATE TABLE IF NOT EXISTS nodes (
            id SERIAL PRIMARY KEY,
            trip_id INTEGER REFERENCES trips(id) ON DELETE CASCADE,
            name TEXT NOT NULL,
            description TEXT,
            notes TEXT,
            arrival_date DATE,
            departure_date DATE,
            latitude DOUBLE PRECISION,
            longitude DOUBLE PRECISION,
            osm_name TEXT,
            osm_id TEXT,
            osm_country TEXT,
            osm_state TEXT,
            geog geography(Point,4326)
        );
        """
    )

    op.execute(
        """
        CREATE TABLE IF NOT EXISTS legs (
            id SERIAL PRIMARY KEY,
            trip_id INTEGER REFERENCES trips(id) ON DELETE CASCADE,
            type TEXT CHECK (type IN ('flight', 'car', 'train', 'bus', 'boat', 'other')),
            notes TEXT,
            date DATE,
            start_node_id INTEGER REFERENCES nodes(id),
            end_node_id INTEGER REFERENCES nodes(id),
            start_latitude DOUBLE PRECISION,
            start_longitude DOUBLE PRECISION,
            end_latitude DOUBLE PRECISION,
            end_longitude DOUBLE PRECISION,
            start_osm_name TEXT,
            start_osm_id TEXT,
            start_osm_country TEXT,
            start_osm_state TEXT,
            end_osm_name TEXT,
            end_osm_id TEXT,
            end_osm_country TEXT,
            end_osm_state TEXT,
            miles DOUBLE PRECISION
        );
        """
    )

    op.execute(
        """
        CREATE TABLE IF NOT EXISTS flight_details (
            leg_id INTEGER PRIMARY KEY REFERENCES legs(id) ON DELETE CASCADE,
            flight_number TEXT,
            airline TEXT,
            start_airport TEXT,
            end_airport TEXT,
            flight_time INT
        );
        """
    )

    op.execute(
        """
        CREATE TABLE IF NOT EXISTS car_details (
            leg_id INTEGER PRIMARY KEY REFERENCES legs(id) ON DELETE CASCADE,
            driving_time_seconds INT,
            polyline TEXT
        );
        """
    )

    op.execute(
        """
        CREATE TABLE IF NOT EXISTS stops (
            id SERIAL PRIMARY KEY,
            trip_id INTEGER REFERENCES trips(id) ON DELETE CASCADE,
            leg_id INTEGER REFERENCES legs(id) ON DELETE CASCADE,
            node_id INTEGER REFERENCES nodes(id) ON DELETE CASCADE,
            category TEXT CHECK (category IN ('hotel', 'restaurant', 'attraction', 'park', 'other')),
            notes TEXT,
            name TEXT NOT NULL,
            latitude DOUBLE PRECISION,
            longitude DOUBLE PRECISION,
            osm_name TEXT,
            osm_id TEXT,
            osm_country TEXT,
            osm_state TEXT,
            time TIMESTAMP,
            geog geography(Point,4326)
        );
        """
    )

    op.execute(
        """
        CREATE TABLE IF NOT EXISTS photos (
            id SERIAL PRIMARY KEY,
            trip_id INTEGER REFERENCES trips(id) ON DELETE CASCADE,
            leg_id INTEGER REFERENCES legs(id) ON DELETE CASCADE,
            node_id INTEGER REFERENCES nodes(id) ON DELETE CASCADE,
            stop_id INTEGER REFERENCES stops(id) ON DELETE CASCADE,
            url TEXT NOT NULL,
            description TEXT
        );
        """
    )

    # Constraints created after tables (Postgres doesn't support IF NOT EXISTS on ADD CONSTRAINT)
    op.execute(
        """
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM pg_constraint WHERE conname = 'photos_check_any_link'
            ) THEN
                ALTER TABLE photos ADD CONSTRAINT photos_check_any_link
                CHECK (
                    trip_id IS NOT NULL OR leg_id IS NOT NULL OR node_id IS NOT NULL OR stop_id IS NOT NULL
                );
            END IF;

            IF NOT EXISTS (
                SELECT 1 FROM pg_constraint WHERE conname = 'check_leg_or_node'
            ) THEN
                ALTER TABLE stops ADD CONSTRAINT check_leg_or_node
                CHECK ((leg_id IS NOT NULL) OR (node_id IS NOT NULL));
            END IF;
        END
        $$;
        """
    )

    # Indexes
    op.execute("CREATE INDEX IF NOT EXISTS idx_nodes_geog ON nodes USING GIST (geog)")
    op.execute("CREATE INDEX IF NOT EXISTS idx_stops_geog ON stops USING GIST (geog)")
    op.execute("CREATE INDEX IF NOT EXISTS idx_nodes_trip_id ON nodes(trip_id)")
    op.execute("CREATE INDEX IF NOT EXISTS idx_legs_trip_id ON legs(trip_id)")
    op.execute("CREATE INDEX IF NOT EXISTS idx_legs_start_node_id ON legs(start_node_id)")
    op.execute("CREATE INDEX IF NOT EXISTS idx_legs_end_node_id ON legs(end_node_id)")
    op.execute("CREATE INDEX IF NOT EXISTS idx_stops_trip_id ON stops(trip_id)")
    op.execute("CREATE INDEX IF NOT EXISTS idx_stops_leg_id ON stops(leg_id)")
    op.execute("CREATE INDEX IF NOT EXISTS idx_stops_node_id ON stops(node_id)")


def downgrade() -> None:
    # Drop in reverse dependency order
    op.execute("DROP TABLE IF EXISTS photos")
    op.execute("DROP TABLE IF EXISTS flight_details")
    op.execute("DROP TABLE IF EXISTS car_details")
    op.execute("DROP TABLE IF EXISTS stops")
    op.execute("DROP TABLE IF EXISTS legs")
    op.execute("DROP TABLE IF EXISTS nodes")
    op.execute("DROP TABLE IF EXISTS trips")
    op.execute("DROP EXTENSION IF EXISTS postgis")
