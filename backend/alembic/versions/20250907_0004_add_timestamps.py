"""add created_at and updated_at to all tables and update triggers

Revision ID: 20250907_0004
Revises: 20250816_0003
Create Date: 2025-09-07

"""
from __future__ import annotations
from alembic import op


# revision identifiers, used by Alembic.
revision = '20250907_0004'
down_revision = '20250816_0003'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add created_at and updated_at columns where missing
    tables = ['nodes', 'legs', 'flight_details', 'car_details', 'stops', 'photos']

    for tbl in tables:
        op.execute(
            f"""
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_name = '{tbl}' AND column_name = 'created_at'
                ) THEN
                    ALTER TABLE {tbl} ADD COLUMN created_at TIMESTAMP;
                END IF;
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_name = '{tbl}' AND column_name = 'updated_at'
                ) THEN
                    ALTER TABLE {tbl} ADD COLUMN updated_at TIMESTAMP;
                END IF;
            END
            $$;
            """
        )
        # Ensure defaults for new rows only (no backfill of existing rows)
        op.execute(f"ALTER TABLE {tbl} ALTER COLUMN created_at SET DEFAULT now();")
        op.execute(f"ALTER TABLE {tbl} ALTER COLUMN updated_at SET DEFAULT now();")

    # Trips already had created_at/updated_at; do not backfill existing rows

    # Create a generic function to bump updated_at
    op.execute(
        """
        CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
        BEGIN
          NEW.updated_at := now();
          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
        """
    )

    # Create/update triggers for all tables
    for tbl in ['trips'] + tables:
        op.execute(
            f"""
            DROP TRIGGER IF EXISTS trg_{tbl}_set_updated_at ON {tbl};
            CREATE TRIGGER trg_{tbl}_set_updated_at
              BEFORE UPDATE ON {tbl}
              FOR EACH ROW EXECUTE FUNCTION set_updated_at();
            """
        )


def downgrade() -> None:
    # Drop triggers
    for tbl in ['trips', 'nodes', 'legs', 'flight_details', 'car_details', 'stops', 'photos']:
        op.execute(f"DROP TRIGGER IF EXISTS trg_{tbl}_set_updated_at ON {tbl};")

    # Drop function
    op.execute("DROP FUNCTION IF EXISTS set_updated_at();")

    # Drop columns we added (do not drop from trips since existed originally)
    for tbl in ['nodes', 'legs', 'flight_details', 'car_details', 'stops', 'photos']:
        op.execute(
            f"""
            DO $$
            BEGIN
                IF EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_name = '{tbl}' AND column_name = 'created_at'
                ) THEN
                    ALTER TABLE {tbl} DROP COLUMN created_at;
                END IF;
                IF EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_name = '{tbl}' AND column_name = 'updated_at'
                ) THEN
                    ALTER TABLE {tbl} DROP COLUMN updated_at;
                END IF;
            END
            $$;
            """
        )
