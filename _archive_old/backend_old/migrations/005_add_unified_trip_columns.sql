-- Add unified trip columns to day_locations and saved_features tables
-- Add columns to day_locations
ALTER TABLE day_locations
ADD COLUMN IF NOT EXISTS start_time TIME,
ADD COLUMN IF NOT EXISTS end_time TIME;

-- Add columns to saved_features
ALTER TABLE saved_features
ADD COLUMN IF NOT EXISTS visit_order INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS transport_mode TEXT,
ADD COLUMN IF NOT EXISTS transport_details TEXT,
ADD COLUMN IF NOT EXISTS transport_cost NUMERIC(10, 2),
ADD COLUMN IF NOT EXISTS duration_minutes INTEGER,
ADD COLUMN IF NOT EXISTS start_time TIME,
ADD COLUMN IF NOT EXISTS end_time TIME;