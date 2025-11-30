-- Add transport-related columns to day_locations table
ALTER TABLE day_locations
ADD COLUMN IF NOT EXISTS transport_mode VARCHAR(50),
ADD COLUMN IF NOT EXISTS transport_details TEXT,
ADD COLUMN IF NOT EXISTS transport_cost DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS duration_minutes INTEGER;