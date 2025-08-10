-- Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;

-- ===================
-- TRIPS
-- ===================
CREATE TABLE trips (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    start_date DATE,
    end_date DATE,
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now()
);

-- ===================
-- NODES (Major Destinations)
-- ===================
CREATE TABLE nodes (
    id SERIAL PRIMARY KEY,
    trip_id INTEGER REFERENCES trips(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    notes TEXT,
    arrival_date DATE,
    departure_date DATE,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    osm_name TEXT,  -- Optional OpenStreetMap name
    osm_id TEXT,    -- Optional OpenStreetMap ID
    osm_country TEXT,
    osm_state TEXT
);

-- ===================
-- LEGS (Travel Segments)
-- ===================
CREATE TABLE legs (
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
    start_osm_name TEXT,  -- Optional OpenStreetMap name for start
    start_osm_id TEXT,    -- Optional OpenStreetMap ID for start
    start_osm_country TEXT,
    start_osm_state TEXT,
    end_osm_name TEXT,    -- Optional OpenStreetMap name for end
    end_osm_id TEXT,      -- Optional OpenStreetMap ID for end
    end_osm_country TEXT,
    end_osm_state TEXT,
    miles DOUBLE PRECISION
);

-- ===================
-- FLIGHT DETAILS (Only for legs with type = 'flight')
-- ===================
CREATE TABLE flight_details (
    leg_id INTEGER PRIMARY KEY REFERENCES legs(id) ON DELETE CASCADE,
    flight_number TEXT,
    airline TEXT,
    start_airport TEXT,
    end_airport TEXT,
    flight_time INT
);

-- ===================
-- CAR DETAILS (Only for legs with type = 'car')
-- ===================
CREATE TABLE car_details (
    leg_id INTEGER PRIMARY KEY REFERENCES legs(id) ON DELETE CASCADE,
    driving_time_seconds INT,
    polyline TEXT
);

-- ===================
-- PHOTOS (Attachable to trip, node, or leg)
-- ===================
CREATE TABLE photos (
    id SERIAL PRIMARY KEY,
    trip_id INTEGER REFERENCES trips(id) ON DELETE CASCADE,
    leg_id INTEGER REFERENCES legs(id) ON DELETE CASCADE,
    node_id INTEGER REFERENCES nodes(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    description TEXT
);

-- ===================
-- STOPS (Attachable to node or leg, represents sub-activities like hotels, restaurants, etc.)
-- ===================
CREATE TABLE stops (
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
    time TIMESTAMP
);

-- Optional constraint: at least one of leg_id or node_id must be present
ALTER TABLE stops ADD CONSTRAINT check_leg_or_node
CHECK (
    (leg_id IS NOT NULL) OR (node_id IS NOT NULL)
);

