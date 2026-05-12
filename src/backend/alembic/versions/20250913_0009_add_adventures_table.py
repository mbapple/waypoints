"""add adventures table and adventure_id to photos

Revision ID: 20250913_0009
Revises: 20250913_0007
Create Date: 2025-09-13

"""
from __future__ import annotations
from alembic import op


# revision identifiers, used by Alembic.
revision = '20250913_0009'
down_revision = '20250913_0008'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create adventures table (standalone single-day locations not tied to trips)
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS adventures (
            id SERIAL PRIMARY KEY,
            category TEXT REFERENCES stop_categories(name) ON UPDATE CASCADE ON DELETE RESTRICT,
            notes TEXT,
            name TEXT NOT NULL,
            latitude DOUBLE PRECISION,
            longitude DOUBLE PRECISION,
            osm_name TEXT,
            osm_id TEXT,
            osm_country TEXT,
            osm_state TEXT,
            start_date DATE,
            end_date DATE,
            geog geography(Point,4326),
            created_at TIMESTAMP DEFAULT now(),
            updated_at TIMESTAMP DEFAULT now()
        );
        """
    )

    # Index for spatial lookups
    op.execute("CREATE INDEX IF NOT EXISTS idx_adventures_geog ON adventures USING GIST (geog)")

    # Trigger function for geog already exists (set_stops_geog logic) - create separate for adventures
    op.execute(
        """
        CREATE OR REPLACE FUNCTION set_adventures_geog() RETURNS trigger AS $$
        BEGIN
          IF NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL THEN
            NEW.geog := ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326)::geography;
          ELSE
            NEW.geog := NULL;
          END IF;
          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;

        DROP TRIGGER IF EXISTS trg_adventures_set_geog ON adventures;
        CREATE TRIGGER trg_adventures_set_geog
          BEFORE INSERT OR UPDATE OF latitude, longitude ON adventures
          FOR EACH ROW EXECUTE FUNCTION set_adventures_geog();
        """
    )

    # updated_at trigger (set_updated_at already created earlier migrations)
    op.execute(
        """
        DROP TRIGGER IF EXISTS trg_adventures_set_updated_at ON adventures;
        CREATE TRIGGER trg_adventures_set_updated_at
          BEFORE UPDATE ON adventures
          FOR EACH ROW EXECUTE FUNCTION set_updated_at();
        """
    )

    # Add adventure_id column to photos
    op.execute(
        """
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name='photos' AND column_name='adventure_id'
            ) THEN
                ALTER TABLE photos ADD COLUMN adventure_id INTEGER REFERENCES adventures(id) ON DELETE CASCADE;
            END IF;
        END
        $$;
        """
    )

    # Update photos check constraint to include adventure_id (drop & recreate)
    op.execute(
        """
        DO $$
        BEGIN
            IF EXISTS (
                SELECT 1 FROM pg_constraint WHERE conname='photos_check_any_link'
            ) THEN
                ALTER TABLE photos DROP CONSTRAINT photos_check_any_link;
            END IF;
        END
        $$;
        ALTER TABLE photos ADD CONSTRAINT photos_check_any_link
        CHECK (trip_id IS NOT NULL OR leg_id IS NOT NULL OR node_id IS NOT NULL OR stop_id IS NOT NULL OR adventure_id IS NOT NULL);
        """
    )


def downgrade() -> None:
    # Revert photos check before dropping column
    op.execute(
        """
        DO $$
        BEGIN
            IF EXISTS (
                SELECT 1 FROM pg_constraint WHERE conname='photos_check_any_link'
            ) THEN
                ALTER TABLE photos DROP CONSTRAINT photos_check_any_link;
            END IF;
        END
        $$;
        ALTER TABLE photos ADD CONSTRAINT photos_check_any_link
        CHECK (trip_id IS NOT NULL OR leg_id IS NOT NULL OR node_id IS NOT NULL OR stop_id IS NOT NULL);
        """
    )
    op.execute("ALTER TABLE photos DROP COLUMN IF EXISTS adventure_id")

    # Drop adventures related objects
    op.execute("DROP TRIGGER IF EXISTS trg_adventures_set_updated_at ON adventures")
    op.execute("DROP TRIGGER IF EXISTS trg_adventures_set_geog ON adventures")
    op.execute("DROP FUNCTION IF EXISTS set_adventures_geog()")
    op.execute("DROP TABLE IF EXISTS adventures")
