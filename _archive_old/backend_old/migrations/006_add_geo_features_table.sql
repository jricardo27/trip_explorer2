-- Create geo_features table for storing GeoJSON features
CREATE TABLE IF NOT EXISTS geo_features (
    id SERIAL PRIMARY KEY,
    source_path TEXT NOT NULL,
    properties JSONB NOT NULL,
    geom GEOMETRY (Geometry, 4326)
);

-- Create spatial index for efficient geographic queries
CREATE INDEX IF NOT EXISTS geo_features_geom_idx ON geo_features USING GIST (geom);

-- Create index on source_path for lookups
CREATE INDEX IF NOT EXISTS idx_geo_features_source_path ON geo_features (source_path);