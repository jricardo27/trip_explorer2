CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE IF NOT EXISTS markers (
    id SERIAL PRIMARY KEY,
    path VARCHAR(255) UNIQUE NOT NULL,
    data JSONB NOT NULL
);

CREATE TABLE IF NOT EXISTS geo_features (
    id SERIAL PRIMARY KEY,
    source_path TEXT NOT NULL,
    properties JSONB NOT NULL,
    geom GEOMETRY (Geometry, 4326)
);

CREATE INDEX IF NOT EXISTS geo_features_geom_idx ON geo_features USING GIST (geom);

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW ()
);

CREATE INDEX IF NOT EXISTS idx_geo_features_source_path ON geo_features (source_path);

CREATE TABLE IF NOT EXISTS saved_features (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    list_name VARCHAR(255) NOT NULL,
    feature JSONB NOT NULL,
    created_at TIMESTAMP
    WITH
        TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_saved_features_user_id ON saved_features (user_id);

CREATE TABLE IF NOT EXISTS trips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    start_date DATE,
    end_date DATE,
    created_at TIMESTAMP DEFAULT NOW ()
);

CREATE TABLE IF NOT EXISTS trip_days (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    trip_id UUID REFERENCES trips (id) ON DELETE CASCADE,
    day_index INT NOT NULL,
    date DATE
);

ALTER TABLE saved_features
ADD COLUMN IF NOT EXISTS trip_day_id UUID REFERENCES trip_days (id) ON DELETE SET NULL;

-- Cities table for geographic data and autocomplete
CREATE TABLE IF NOT EXISTS cities (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    ascii_name VARCHAR(200),
    country_code CHAR(2) NOT NULL,
    country_name VARCHAR(100),
    admin1_code VARCHAR(20),
    admin1_name VARCHAR(100),
    population INTEGER,
    latitude DECIMAL(10, 7) NOT NULL,
    longitude DECIMAL(10, 7) NOT NULL,
    location_coords GEOMETRY (Point, 4326),
    feature_class CHAR(1),
    feature_code VARCHAR(10),
    created_at TIMESTAMP DEFAULT NOW ()
);

CREATE INDEX IF NOT EXISTS idx_cities_name ON cities (name);

CREATE INDEX IF NOT EXISTS idx_cities_country ON cities (country_code);

CREATE INDEX IF NOT EXISTS idx_cities_coords ON cities USING GIST (location_coords);

CREATE INDEX IF NOT EXISTS idx_cities_search ON cities (name, country_name);

-- Day locations table for multi-location trip days
CREATE TABLE IF NOT EXISTS day_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    trip_day_id UUID NOT NULL REFERENCES trip_days (id) ON DELETE CASCADE,
    country VARCHAR(100) NOT NULL,
    country_code CHAR(2),
    city VARCHAR(100),
    town VARCHAR(100),
    latitude DECIMAL(10, 7),
    longitude DECIMAL(10, 7),
    location_coords GEOMETRY (Point, 4326),
    visit_order INTEGER NOT NULL DEFAULT 1,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW ()
);

CREATE INDEX IF NOT EXISTS idx_day_locations_trip_day ON day_locations (trip_day_id);

CREATE INDEX IF NOT EXISTS idx_day_locations_country ON day_locations (country_code);

ALTER TABLE trips
ADD COLUMN IF NOT EXISTS animation_config JSONB DEFAULT '{}';

ALTER TABLE day_locations
ADD COLUMN IF NOT EXISTS animation_config JSONB DEFAULT '{}';

ALTER TABLE saved_features
ADD COLUMN IF NOT EXISTS animation_config JSONB DEFAULT '{}';