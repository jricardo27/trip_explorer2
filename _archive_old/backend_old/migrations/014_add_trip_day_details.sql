-- Add name and notes columns to trip_days table
ALTER TABLE trip_days
ADD COLUMN IF NOT EXISTS name TEXT,
ADD COLUMN IF NOT EXISTS notes TEXT;