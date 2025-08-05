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
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    arrival_date DATE,
    departure_date DATE,
    notes TEXT
);

-- ===================
-- LEGS (Travel Segments)
-- ===================
CREATE TABLE legs (
    id SERIAL PRIMARY KEY,
    trip_id INTEGER REFERENCES trips(id) ON DELETE CASCADE,
    type TEXT CHECK (type IN ('flight', 'car', 'train', 'bus', 'boat')),
    date DATE,
    start_node_id INTEGER REFERENCES nodes(id),
    end_node_id INTEGER REFERENCES nodes(id),
    start_location GEOGRAPHY(Point, 4326),
    end_location GEOGRAPHY(Point, 4326),
    miles DOUBLE PRECISION,
    notes TEXT
);

-- ===================
-- FLIGHT DETAILS (Only for legs with type = 'flight')
-- ===================
CREATE TABLE flight_details (
    leg_id INTEGER PRIMARY KEY REFERENCES legs(id) ON DELETE CASCADE,
    flight_number TEXT,
    airline TEXT,
    start_airport TEXT,
    end_airport TEXT
);

-- ===================
-- CAR DETAILS (Only for legs with type = 'car')
-- ===================
CREATE TABLE car_details (
    leg_id INTEGER PRIMARY KEY REFERENCES legs(id) ON DELETE CASCADE,
    stops TEXT[]  -- Optional stopover place names
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
    leg_id INTEGER REFERENCES legs(id) ON DELETE CASCADE,
    node_id INTEGER REFERENCES nodes(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    time TIMESTAMP,
    category TEXT, -- e.g. 'restaurant', 'hotel', 'sightseeing', 'station', etc.
    notes TEXT
);

-- Optional constraint: at least one of leg_id or node_id must be present
ALTER TABLE stops ADD CONSTRAINT check_leg_or_node
CHECK (
    (leg_id IS NOT NULL) OR (node_id IS NOT NULL)
);

