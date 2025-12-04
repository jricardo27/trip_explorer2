-- Add visit tracking columns to support planned vs. actual trip tracking
-- This migration adds the ability to mark locations and features as:
-- - planned: intended to visit (but may not have visited)
-- - visited: actually visited during the trip

-- Add visit tracking columns to day_locations
ALTER TABLE day_locations
ADD COLUMN IF NOT EXISTS visited BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS planned BOOLEAN DEFAULT FALSE;

-- Add visit tracking columns to saved_features
ALTER TABLE saved_features
ADD COLUMN IF NOT EXISTS visited BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS planned BOOLEAN DEFAULT FALSE;

-- Add indexes for efficient filtering
CREATE INDEX IF NOT EXISTS idx_day_locations_visited ON day_locations(visited);
CREATE INDEX IF NOT EXISTS idx_day_locations_planned ON day_locations(planned);
CREATE INDEX IF NOT EXISTS idx_saved_features_visited ON saved_features(visited);
CREATE INDEX IF NOT EXISTS idx_saved_features_planned ON saved_features(planned);

-- Update existing records to be marked as visited (not planned)
-- This ensures backward compatibility
UPDATE day_locations SET visited = TRUE, planned = FALSE WHERE visited IS NULL;
UPDATE saved_features SET visited = TRUE, planned = FALSE WHERE visited IS NULL;
