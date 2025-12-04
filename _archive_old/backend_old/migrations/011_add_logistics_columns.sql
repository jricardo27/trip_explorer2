-- Add logistics columns to day_locations
ALTER TABLE day_locations
ADD COLUMN IF NOT EXISTS duration_minutes INTEGER,
ADD COLUMN IF NOT EXISTS travel_time_minutes INTEGER,
ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS subtype TEXT;

-- Add logistics columns to saved_features
ALTER TABLE saved_features
ADD COLUMN IF NOT EXISTS travel_time_minutes INTEGER,
ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS subtype TEXT;

-- Note: saved_features already has duration_minutes from 005_add_unified_trip_columns.sql

-- Add indexes for efficient filtering
CREATE INDEX IF NOT EXISTS idx_day_locations_is_locked ON day_locations(is_locked);
CREATE INDEX IF NOT EXISTS idx_saved_features_is_locked ON saved_features(is_locked);
