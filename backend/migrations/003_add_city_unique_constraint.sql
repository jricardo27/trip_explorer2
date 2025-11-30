-- Add unique constraint to cities table
-- Prevents duplicate city entries

CREATE TABLE IF NOT EXISTS meta (
  key VARCHAR(255) PRIMARY KEY,
  value TEXT
);

-- Add unique constraint (ignore if already exists)
DO $$
BEGIN
  ALTER TABLE cities
  ADD CONSTRAINT cities_unique_entry UNIQUE (name, country_code, latitude, longitude);
EXCEPTION
  WHEN duplicate_object THEN
    -- Constraint already exists, ignore
    NULL;
  WHEN unique_violation THEN
    RAISE NOTICE 'Cannot add unique constraint due to duplicate data. Please clean up duplicates manually.';
END$$;
