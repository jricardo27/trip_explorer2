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