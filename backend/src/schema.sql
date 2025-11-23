CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE IF NOT EXISTS markers (
    id SERIAL PRIMARY KEY,
    path VARCHAR(255) UNIQUE NOT NULL,
    data JSONB NOT NULL
);

CREATE TABLE IF NOT EXISTS geo_features (
    id SERIAL PRIMARY KEY,
    source_path VARCHAR(255) NOT NULL,
    properties JSONB NOT NULL,
    geom GEOMETRY (Geometry, 4326) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_geo_features_geom ON geo_features USING GIST (geom);

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