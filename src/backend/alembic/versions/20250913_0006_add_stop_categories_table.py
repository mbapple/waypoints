"""add stop_categories table and migrate existing categories

Revision ID: 20250913_0006
Revises: 20250910_0005
Create Date: 2025-09-13

"""
from __future__ import annotations
from alembic import op


# revision identifiers, used by Alembic.
revision = '20250913_0006'
down_revision = '20250910_0005'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Drop existing static CHECK constraint (if present)
    op.execute(
        """
        DO $$
        BEGIN
            IF EXISTS (
                SELECT 1 FROM pg_constraint
                WHERE conname = 'stops_category_check'
            ) THEN
                ALTER TABLE stops DROP CONSTRAINT stops_category_check;
            END IF;
        END
        $$;
        """
    )

    # Create stop_categories table (if not exists)
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS stop_categories (
            id SERIAL PRIMARY KEY,
            name TEXT NOT NULL UNIQUE,
            created_at TIMESTAMP DEFAULT now(),
            updated_at TIMESTAMP DEFAULT now()
        );
        """
    )

    # Ensure the generic updated_at trigger function exists (idempotent)
    op.execute(
        """
        CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $FUNC$
        BEGIN
          NEW.updated_at := now();
          RETURN NEW;
        END;
        $FUNC$ LANGUAGE plpgsql;
        """
    )

    # Add trigger for stop_categories
    op.execute(
        """
        DROP TRIGGER IF EXISTS trg_stop_categories_set_updated_at ON stop_categories;
        CREATE TRIGGER trg_stop_categories_set_updated_at
          BEFORE UPDATE ON stop_categories
          FOR EACH ROW EXECUTE FUNCTION set_updated_at();
        """
    )

    # Populate table with distinct existing categories from stops
    op.execute(
        """
        INSERT INTO stop_categories (name)
        SELECT DISTINCT category FROM stops
        WHERE category IS NOT NULL
          AND NOT EXISTS (
              SELECT 1 FROM stop_categories sc WHERE sc.name = stops.category
          );
        """
    )

    # Ensure 'other' always exists
    op.execute(
        """
        INSERT INTO stop_categories (name)
        SELECT 'other'
        WHERE NOT EXISTS (SELECT 1 FROM stop_categories WHERE name = 'other');
        """
    )

    # Add default on stops.category and foreign key referencing stop_categories(name)
    op.execute("ALTER TABLE stops ALTER COLUMN category SET DEFAULT 'other';")
    op.execute(
        """
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM pg_constraint WHERE conname = 'stops_category_fkey'
            ) THEN
                ALTER TABLE stops
                ADD CONSTRAINT stops_category_fkey
                FOREIGN KEY (category) REFERENCES stop_categories(name)
                ON UPDATE CASCADE ON DELETE RESTRICT;
            END IF;
        END
        $$;
        """
    )


def downgrade() -> None:
    # Drop FK constraint
    op.execute(
        """
        DO $$
        BEGIN
            IF EXISTS (
                SELECT 1 FROM pg_constraint WHERE conname = 'stops_category_fkey'
            ) THEN
                ALTER TABLE stops DROP CONSTRAINT stops_category_fkey;
            END IF;
        END
        $$;
        """
    )

    # Remove default
    op.execute("ALTER TABLE stops ALTER COLUMN category DROP DEFAULT;")

    # Drop table
    op.execute("DROP TABLE IF EXISTS stop_categories;")

    # Recreate static CHECK constraint (latest set included 'museum')
    op.execute(
        """
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM pg_constraint WHERE conname = 'stops_category_check'
            ) THEN
                ALTER TABLE stops ADD CONSTRAINT stops_category_check
                CHECK (category IN ('hotel', 'restaurant', 'attraction', 'park', 'museum', 'other'));
            END IF;
        END
        $$;
        """
    )
