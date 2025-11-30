-- Drop Trip Templates Table
-- This migration removes the trip templates feature

DROP TRIGGER IF EXISTS trip_templates_updated_at ON trip_templates;
DROP FUNCTION IF EXISTS update_trip_templates_updated_at();
DROP INDEX IF EXISTS idx_trip_templates_public;
DROP INDEX IF EXISTS idx_trip_templates_user_id;
DROP TABLE IF EXISTS trip_templates;
