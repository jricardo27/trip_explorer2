-- Initial schema for Trip Explorer
-- Creates all base tables required by the application

-- Enable PostGIS extension for geographic data
CREATE EXTENSION IF NOT EXISTS postgis;

-- Users table for authentication
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Markers table for storing marker data
CREATE TABLE IF NOT EXISTS markers (
  id SERIAL PRIMARY KEY,
  path VARCHAR(255) UNIQUE NOT NULL,
  data JSONB NOT NULL
);

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
  location_coords GEOMETRY(Point, 4326),
  feature_class CHAR(1),
  feature_code VARCHAR(10),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for cities table
CREATE INDEX IF NOT EXISTS idx_cities_name ON cities(name);
CREATE INDEX IF NOT EXISTS idx_cities_country ON cities(country_code);
CREATE INDEX IF NOT EXISTS idx_cities_coords ON cities USING GIST(location_coords);
CREATE INDEX IF NOT EXISTS idx_cities_search ON cities(name, country_name);

-- Trips table for storing trip information
CREATE TABLE IF NOT EXISTS trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  start_date DATE,
  end_date DATE,
  animation_config JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Trip days table for organizing trips by day
CREATE TABLE IF NOT EXISTS trip_days (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID REFERENCES trips(id) ON DELETE CASCADE,
  day_index INT NOT NULL,
  date DATE
);

-- Saved features table for user-saved locations/features
CREATE TABLE IF NOT EXISTS saved_features (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  list_name VARCHAR(255) NOT NULL,
  feature JSONB NOT NULL,
  trip_day_id UUID REFERENCES trip_days(id) ON DELETE SET NULL,
  animation_config JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_saved_features_user_id ON saved_features(user_id);

-- Day locations table for multi-location trip days
CREATE TABLE IF NOT EXISTS day_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_day_id UUID NOT NULL REFERENCES trip_days(id) ON DELETE CASCADE,
  country VARCHAR(100) NOT NULL,
  country_code CHAR(2),
  city VARCHAR(100),
  town VARCHAR(100),
  latitude DECIMAL(10, 7),
  longitude DECIMAL(10, 7),
  location_coords GEOMETRY(Point, 4326),
  visit_order INTEGER NOT NULL DEFAULT 1,
  notes TEXT,
  animation_config JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_day_locations_trip_day ON day_locations(trip_day_id);
CREATE INDEX IF NOT EXISTS idx_day_locations_country ON day_locations(country_code);

-- Updated at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at trigger to trips
CREATE TRIGGER trips_updated_at
BEFORE UPDATE ON trips
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
