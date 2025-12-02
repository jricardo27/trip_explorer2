-- Migration 013: Migrate Data to Activities Table
-- This migration moves data from day_locations and saved_features to the new unified activities table
-- Created: 2025-12-03

-- ============================================
-- MIGRATE DAY_LOCATIONS TO ACTIVITIES
-- ============================================

INSERT INTO
    activities (
        trip_id,
        trip_day_id,
        activity_type,
        name,
        location_coords,
        city,
        country,
        country_code,
        scheduled_start,
        duration_minutes,
        status,
        notes,
        legacy_location_id,
        created_at
    )
SELECT
    td.trip_id,
    dl.trip_day_id,
    'custom' as activity_type,
    COALESCE(
        NULLIF(
            CONCAT_WS(', ', dl.city, dl.country),
            ', '
        ),
        dl.country,
        'Location'
    ) as name,
    dl.location_coords,
    dl.city,
    dl.country,
    dl.country_code,
    CASE
        WHEN dl.start_time IS NOT NULL THEN (
            td.date || ' ' || dl.start_time
        )::TIMESTAMPTZ
        ELSE NULL
    END as scheduled_start,
    dl.duration_minutes,
    CASE
        WHEN dl.visited = TRUE THEN 'completed'
        WHEN dl.planned = TRUE THEN 'planned'
        ELSE 'planned'
    END as status,
    dl.notes,
    dl.id as legacy_location_id,
    dl.created_at
FROM
    day_locations dl
    JOIN trip_days td ON dl.trip_day_id = td.id
WHERE
    NOT EXISTS (
        SELECT 1
        FROM activities a
        WHERE
            a.legacy_location_id = dl.id
    );

-- ============================================
-- MIGRATE SAVED_FEATURES TO ACTIVITIES
-- ============================================

INSERT INTO
    activities (
        trip_id,
        trip_day_id,
        activity_type,
        name,
        location_coords,
        description,
        scheduled_start,
        duration_minutes,
        status,
        legacy_feature_id,
        created_at
    )
SELECT
    td.trip_id,
    sf.trip_day_id,
    CASE
        WHEN sf.feature -> 'properties' ->> 'type' = 'restaurant' THEN 'restaurant'
        WHEN sf.feature -> 'properties' ->> 'type' = 'museum' THEN 'attraction'
        WHEN sf.feature -> 'properties' ->> 'amenity' = 'restaurant' THEN 'restaurant'
        WHEN sf.feature -> 'properties' ->> 'amenity' = 'cafe' THEN 'restaurant'
        WHEN sf.feature -> 'properties' ->> 'tourism' = 'attraction' THEN 'attraction'
        WHEN sf.feature -> 'properties' ->> 'tourism' = 'museum' THEN 'attraction'
        WHEN sf.feature -> 'properties' ->> 'tourism' = 'hotel' THEN 'hotel'
        ELSE 'attraction'
    END as activity_type,
    COALESCE(
        sf.feature -> 'properties' ->> 'name',
        sf.feature -> 'properties' ->> 'title',
        'Saved Location'
    ) as name,
    CASE
        WHEN sf.feature -> 'geometry' ->> 'type' = 'Point' THEN ST_SetSRID (
            ST_MakePoint (
                (
                    sf.feature -> 'geometry' -> 'coordinates' ->> 0
                )::FLOAT,
                (
                    sf.feature -> 'geometry' -> 'coordinates' ->> 1
                )::FLOAT
            ),
            4326
        )
        ELSE NULL
    END as location_coords,
    sf.feature -> 'properties' ->> 'description' as description,
    CASE
        WHEN sf.start_time IS NOT NULL THEN (
            td.date || ' ' || sf.start_time
        )::TIMESTAMPTZ
        ELSE NULL
    END as scheduled_start,
    sf.duration_minutes,
    CASE
        WHEN sf.visited = TRUE THEN 'completed'
        WHEN sf.planned = TRUE THEN 'planned'
        ELSE 'planned'
    END as status,
    sf.id as legacy_feature_id,
    sf.created_at
FROM
    saved_features sf
    JOIN trip_days td ON sf.trip_day_id = td.id
WHERE
    sf.trip_day_id IS NOT NULL
    AND NOT EXISTS (
        SELECT 1
        FROM activities a
        WHERE
            a.legacy_feature_id = sf.id
    );

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Count original records
DO $$
DECLARE
  day_locations_count INTEGER;
  saved_features_count INTEGER;
  activities_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO day_locations_count FROM day_locations;
  SELECT COUNT(*) INTO saved_features_count FROM saved_features WHERE trip_day_id IS NOT NULL;
  SELECT COUNT(*) INTO activities_count FROM activities WHERE legacy_location_id IS NOT NULL OR legacy_feature_id IS NOT NULL;
  
  RAISE NOTICE 'Migration Summary:';
  RAISE NOTICE '  day_locations: % rows', day_locations_count;
  RAISE NOTICE '  saved_features (with trip_day_id): % rows', saved_features_count;
  RAISE NOTICE '  activities (migrated): % rows', activities_count;
  RAISE NOTICE '  Expected total: %', day_locations_count + saved_features_count;
  
  IF activities_count != (day_locations_count + saved_features_count) THEN
    RAISE WARNING 'Row count mismatch! Expected %, got %', 
      day_locations_count + saved_features_count, 
      activities_count;
  ELSE
    RAISE NOTICE 'Migration successful! All rows migrated.';
  END IF;
END $$;

-- Sample migrated data for verification
SELECT 'From day_locations' as source, a.id, a.name, a.activity_type, a.scheduled_start, a.status, a.legacy_location_id
FROM activities a
WHERE
    a.legacy_location_id IS NOT NULL
LIMIT 5;

SELECT 'From saved_features' as source, a.id, a.name, a.activity_type, a.scheduled_start, a.status, a.legacy_feature_id
FROM activities a
WHERE
    a.legacy_feature_id IS NOT NULL
LIMIT 5;