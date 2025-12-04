# 01 - Final Implementation Plan (Backend-First)

## Overview

This is the **definitive implementation plan** for the Trip Explorer redesign, incorporating all user requirements and addressing all identified issues from the current implementation.

---

## User Requirements Summary

1. ✅ **Photo Links** - Users provide links to cloud storage (no file uploads)
2. ✅ **Implementation Order** - Core + Calendar → Transport → Expenses & Members
3. ✅ **Backend-First** - All database models upfront, frontend later
4. ✅ **Optional Activities** - Show alternatives at same time slot
5. ✅ **Currency Conversion** - Historical rates, trip default currency, dual display
6. ✅ **Member Assignment** - Trip-level defaults, activity-level overrides
7. ✅ **Change History** - Audit log for all changes
8. ✅ **Optimize Markers** - Fix bandwidth issue
9. ✅ **Remove Redundancy** - Use only PostGIS geometry (no lat/lng fields)
10. ✅ **No Cloud SQL** - PostgreSQL on Compute Engine VM only

---

## Phase 1: Complete Backend Foundation (Weeks 1-4)

### Week 1: Database Schema - ALL Models

Create single migration: `012_complete_schema_redesign.sql`

#### Step 1: Drop Redundant Columns

```sql
-- Remove redundant lat/lng columns (keep only PostGIS geometry)
ALTER TABLE day_locations DROP COLUMN IF EXISTS latitude;
ALTER TABLE day_locations DROP COLUMN IF EXISTS longitude;

ALTER TABLE cities DROP COLUMN IF EXISTS latitude;
ALTER TABLE cities DROP COLUMN IF EXISTS longitude;
```

#### Step 2: Fix Existing Tables

```sql
-- Fix trips.user_id to be proper FK
ALTER TABLE trips
ALTER COLUMN user_id TYPE UUID USING user_id::UUID,
ADD CONSTRAINT fk_trips_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- Add new columns to trips
ALTER TABLE trips
ADD COLUMN IF NOT EXISTS budget NUMERIC(10, 2),
ADD COLUMN IF NOT EXISTS default_currency CHAR(3) DEFAULT 'AUD',
ADD COLUMN IF NOT EXISTS is_completed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'Australia/Sydney';
```

#### Step 3: Create Currency System

```sql
-- Currency conversion rates (historical)
CREATE TABLE currency_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_currency CHAR(3) NOT NULL,  -- 'USD'
  to_currency CHAR(3) NOT NULL,    -- 'AUD'
  rate NUMERIC(10, 6) NOT NULL,    -- 1.550000
  effective_date DATE NOT NULL,     -- When this rate became effective
  source TEXT DEFAULT 'manual',     -- 'manual', 'api', 'user'
  notes TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT unique_rate_per_date UNIQUE (from_currency, to_currency, effective_date)
);

CREATE INDEX idx_currency_rates_pair ON currency_rates(from_currency, to_currency);
CREATE INDEX idx_currency_rates_date ON currency_rates(effective_date DESC);

-- Function to get rate for a specific date
CREATE OR REPLACE FUNCTION get_currency_rate(
  p_from_currency CHAR(3),
  p_to_currency CHAR(3),
  p_date DATE DEFAULT CURRENT_DATE
) RETURNS NUMERIC(10, 6) AS $$
DECLARE
  v_rate NUMERIC(10, 6);
BEGIN
  -- If same currency, return 1
  IF p_from_currency = p_to_currency THEN
    RETURN 1.0;
  END IF;

  -- Get most recent rate before or on the given date
  SELECT rate INTO v_rate
  FROM currency_rates
  WHERE from_currency = p_from_currency
    AND to_currency = p_to_currency
    AND effective_date <= p_date
  ORDER BY effective_date DESC
  LIMIT 1;

  -- If no rate found, return NULL (caller should handle)
  RETURN v_rate;
END;
$$ LANGUAGE plpgsql;
```

#### Step 4: Create Unified Activities Table

```sql
CREATE TABLE activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  trip_day_id UUID REFERENCES trip_days(id) ON DELETE CASCADE,

  -- Type & Classification
  activity_type TEXT NOT NULL, -- 'flight', 'hotel', 'attraction', 'restaurant', 'travel', 'custom'
  activity_subtype TEXT,
  category TEXT, -- User-defined category

  -- Basic Info
  name TEXT NOT NULL,
  description TEXT,
  notes TEXT, -- Planning notes
  experience_notes TEXT, -- Post-trip notes

  -- Location (PostGIS only, no redundant lat/lng)
  location_coords GEOMETRY(Point, 4326),
  address TEXT,
  city TEXT,
  country TEXT,
  country_code CHAR(2),

  -- Timing
  scheduled_start TIMESTAMPTZ,
  scheduled_end TIMESTAMPTZ,
  actual_start TIMESTAMPTZ,
  actual_end TIMESTAMPTZ,
  duration_minutes INTEGER,
  actual_duration_minutes INTEGER,
  is_all_day BOOLEAN DEFAULT FALSE,
  is_flexible BOOLEAN DEFAULT FALSE,

  -- Multi-day support
  spans_multiple_days BOOLEAN DEFAULT FALSE,
  end_day_id UUID REFERENCES trip_days(id),

  -- Status & Priority
  status TEXT DEFAULT 'planned', -- 'planned', 'confirmed', 'completed', 'cancelled', 'skipped'
  priority TEXT DEFAULT 'normal', -- 'must_do', 'high', 'normal', 'low', 'optional'

  -- Optional/Alternative Activities
  parent_activity_id UUID REFERENCES activities(id) ON DELETE CASCADE,
  is_alternative BOOLEAN DEFAULT FALSE,
  alternative_group_id UUID, -- Group alternatives together

  -- Booking & Logistics
  booking_reference TEXT,
  booking_url TEXT,
  confirmation_number TEXT,
  requires_booking BOOLEAN DEFAULT FALSE,
  booking_deadline TIMESTAMPTZ,

  -- Contact & Hours
  phone TEXT,
  email TEXT,
  website TEXT,
  opening_hours JSONB, -- {"monday": "09:00-17:00", ...}

  -- Costs (with currency support)
  estimated_cost NUMERIC(10, 2),
  actual_cost NUMERIC(10, 2),
  currency CHAR(3) DEFAULT 'AUD',
  cost_category TEXT, -- 'transport', 'accommodation', 'food', 'activity', 'shopping', 'other'
  is_paid BOOLEAN DEFAULT FALSE,
  payment_method TEXT,

  -- Group Management
  use_default_members BOOLEAN DEFAULT TRUE,
  is_group_activity BOOLEAN DEFAULT TRUE,

  -- Metadata
  source TEXT DEFAULT 'manual', -- 'manual', 'imported', 'suggested'
  external_id TEXT,
  tags TEXT[],

  -- Legacy compatibility (for migration)
  legacy_location_id UUID,
  legacy_feature_id INTEGER,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id),

  CONSTRAINT valid_times CHECK (
    (scheduled_start IS NULL AND scheduled_end IS NULL) OR
    (scheduled_start IS NOT NULL AND scheduled_end IS NOT NULL AND scheduled_end > scheduled_start)
  ),
  CONSTRAINT valid_alternative CHECK (
    (is_alternative = FALSE AND parent_activity_id IS NULL) OR
    (is_alternative = TRUE AND parent_activity_id IS NOT NULL)
  )
);

CREATE INDEX idx_activities_trip_id ON activities(trip_id);
CREATE INDEX idx_activities_trip_day_id ON activities(trip_day_id);
CREATE INDEX idx_activities_type ON activities(activity_type);
CREATE INDEX idx_activities_status ON activities(status);
CREATE INDEX idx_activities_scheduled_start ON activities(scheduled_start);
CREATE INDEX idx_activities_location ON activities USING GIST(location_coords);
CREATE INDEX idx_activities_tags ON activities USING GIN(tags);
CREATE INDEX idx_activities_parent ON activities(parent_activity_id) WHERE parent_activity_id IS NOT NULL;
```

#### Step 5: Create Transport System

```sql
CREATE TABLE transport_alternatives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  from_activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  to_activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,

  -- Alternative Details
  name TEXT NOT NULL, -- "Taxi", "Express Bus #42", "Subway Line 2"
  transport_mode TEXT NOT NULL, -- 'taxi', 'bus', 'train', 'walk', 'car', 'uber', 'flight', 'ferry'
  is_selected BOOLEAN DEFAULT FALSE,

  -- Timing
  duration_minutes INTEGER NOT NULL,
  buffer_minutes INTEGER DEFAULT 0,
  total_duration_minutes INTEGER GENERATED ALWAYS AS (duration_minutes + buffer_minutes) STORED,

  -- Availability
  available_from TIME,
  available_to TIME,
  available_days INTEGER[], -- [1,2,3,4,5] for weekdays
  frequency_minutes INTEGER, -- Runs every X minutes

  -- Cost (with currency)
  cost NUMERIC(10, 2),
  currency CHAR(3) DEFAULT 'AUD',
  cost_per_person BOOLEAN DEFAULT TRUE,

  -- Route
  distance_meters INTEGER,
  route_geometry GEOMETRY(LineString, 4326),
  waypoints JSONB, -- [{"name": "Transfer at Central", "coords": [lng, lat]}]

  -- Description
  description TEXT, -- "Take Metro Line 2, transfer at Central, then 5 min walk"
  notes TEXT,
  pros TEXT[], -- ["Cheapest", "Scenic route"]
  cons TEXT[], -- ["Requires 2 transfers", "Crowded during rush hour"]

  -- Booking
  requires_booking BOOLEAN DEFAULT FALSE,
  booking_url TEXT,
  booking_reference TEXT,

  -- Validation
  is_feasible BOOLEAN DEFAULT TRUE,
  infeasibility_reason TEXT,

  -- Metadata
  source TEXT DEFAULT 'manual', -- 'manual', 'osrm', 'google_maps'
  confidence_score NUMERIC(3, 2), -- 0.0-1.0
  last_validated_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT one_selected_per_connection UNIQUE (from_activity_id, to_activity_id, is_selected)
    WHERE is_selected = TRUE
);

CREATE INDEX idx_transport_alternatives_from ON transport_alternatives(from_activity_id);
CREATE INDEX idx_transport_alternatives_to ON transport_alternatives(to_activity_id);
CREATE INDEX idx_transport_alternatives_selected ON transport_alternatives(is_selected) WHERE is_selected = TRUE;
CREATE INDEX idx_transport_alternatives_route ON transport_alternatives USING GIST(route_geometry);
```

#### Step 6: Create Member System

```sql
-- Trip members
CREATE TABLE trip_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL, -- NULL if not a registered user

  -- Member Info
  name TEXT NOT NULL,
  email TEXT,
  role TEXT DEFAULT 'member', -- 'owner', 'editor', 'viewer', 'member'

  -- Preferences
  avatar_url TEXT,
  color TEXT, -- For visual distinction in UI

  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT unique_user_per_trip UNIQUE(trip_id, user_id) WHERE user_id IS NOT NULL
);

CREATE INDEX idx_trip_members_trip_id ON trip_members(trip_id);
CREATE INDEX idx_trip_members_user_id ON trip_members(user_id);

-- Activity participants (who's doing this activity)
CREATE TABLE activity_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES trip_members(id) ON DELETE CASCADE,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT unique_participant_per_activity UNIQUE(activity_id, member_id)
);

CREATE INDEX idx_activity_participants_activity ON activity_participants(activity_id);
CREATE INDEX idx_activity_participants_member ON activity_participants(member_id);
```

#### Step 7: Create Expense System

```sql
-- Expenses
CREATE TABLE expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,

  -- Association
  activity_id UUID REFERENCES activities(id) ON DELETE SET NULL,
  transport_alternative_id UUID REFERENCES transport_alternatives(id) ON DELETE SET NULL,

  -- Basic Info
  description TEXT NOT NULL,
  category TEXT NOT NULL, -- 'transport', 'accommodation', 'food', 'activity', 'shopping', 'other'
  subcategory TEXT,

  -- Amount (with currency and conversion)
  amount NUMERIC(10, 2) NOT NULL,
  currency CHAR(3) NOT NULL DEFAULT 'AUD',
  amount_in_trip_currency NUMERIC(10, 2), -- Converted to trip's default currency
  exchange_rate NUMERIC(10, 6), -- Rate used for conversion
  exchange_rate_date DATE, -- Date of the rate

  -- Payment
  paid_by UUID REFERENCES trip_members(id),
  payment_method TEXT, -- 'cash', 'credit_card', 'debit_card', 'mobile_payment'
  payment_date DATE,

  -- Status
  is_estimated BOOLEAN DEFAULT TRUE,
  is_paid BOOLEAN DEFAULT FALSE,
  is_refundable BOOLEAN DEFAULT FALSE,

  -- Receipt
  receipt_url TEXT, -- Link to receipt photo in user's cloud
  receipt_number TEXT,

  -- Splitting
  is_shared BOOLEAN DEFAULT FALSE,
  split_type TEXT DEFAULT 'equal', -- 'equal', 'percentage', 'custom', 'none'

  -- Metadata
  tags TEXT[],
  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id)
);

CREATE INDEX idx_expenses_trip_id ON expenses(trip_id);
CREATE INDEX idx_expenses_activity_id ON expenses(activity_id);
CREATE INDEX idx_expenses_paid_by ON expenses(paid_by);
CREATE INDEX idx_expenses_category ON expenses(category);
CREATE INDEX idx_expenses_payment_date ON expenses(payment_date);

-- Expense splits
CREATE TABLE expense_splits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id UUID NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES trip_members(id) ON DELETE CASCADE,

  amount NUMERIC(10, 2) NOT NULL,
  percentage NUMERIC(5, 2),

  is_paid BOOLEAN DEFAULT FALSE,
  paid_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT unique_split_per_expense UNIQUE(expense_id, member_id)
);

CREATE INDEX idx_expense_splits_expense_id ON expense_splits(expense_id);
CREATE INDEX idx_expense_splits_member_id ON expense_splits(member_id);

-- Budgets
CREATE TABLE budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,

  category TEXT NOT NULL, -- 'total', 'transport', 'accommodation', 'food', 'activities', 'shopping', 'other'
  amount NUMERIC(10, 2) NOT NULL,
  currency CHAR(3) NOT NULL DEFAULT 'AUD',

  spent_amount NUMERIC(10, 2) DEFAULT 0,
  remaining_amount NUMERIC(10, 2) GENERATED ALWAYS AS (amount - spent_amount) STORED,

  alert_threshold_percentage INTEGER DEFAULT 80,
  alert_sent BOOLEAN DEFAULT FALSE,

  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT unique_budget_per_category UNIQUE(trip_id, category)
);

CREATE INDEX idx_budgets_trip_id ON budgets(trip_id);
```

#### Step 8: Create Photo System (Links Only)

```sql
-- Trip photos (links to user's cloud storage)
CREATE TABLE trip_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  activity_id UUID REFERENCES activities(id) ON DELETE SET NULL,

  -- Photo URLs (user provides)
  photo_url TEXT NOT NULL,
  thumbnail_url TEXT,

  -- Metadata
  caption TEXT,
  taken_at TIMESTAMPTZ,

  -- Cloud storage info
  cloud_provider TEXT, -- 'google_photos', 'icloud', 'dropbox', 'onedrive', 'other'
  cloud_photo_id TEXT,

  -- Uploaded by
  uploaded_by UUID REFERENCES users(id),

  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT valid_photo_url CHECK (photo_url ~ '^https?://')
);

CREATE INDEX idx_trip_photos_trip_id ON trip_photos(trip_id);
CREATE INDEX idx_trip_photos_activity_id ON trip_photos(activity_id);
CREATE INDEX idx_trip_photos_taken_at ON trip_photos(taken_at);
```

#### Step 9: Create Collaboration System

```sql
-- Trip shares
CREATE TABLE trip_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  shared_with_user_id UUID REFERENCES users(id) ON DELETE CASCADE,

  permission TEXT DEFAULT 'view', -- 'view', 'edit'

  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id),

  CONSTRAINT unique_share_per_user UNIQUE(trip_id, shared_with_user_id)
);

CREATE INDEX idx_trip_shares_trip_id ON trip_shares(trip_id);
CREATE INDEX idx_trip_shares_user_id ON trip_shares(shared_with_user_id);

-- Activity comments
CREATE TABLE activity_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  comment TEXT NOT NULL,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_activity_comments_activity ON activity_comments(activity_id);
CREATE INDEX idx_activity_comments_created_at ON activity_comments(created_at DESC);
```

#### Step 10: Create Audit Log (Change History)

```sql
-- Audit log for change history
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- What changed
  table_name TEXT NOT NULL,
  record_id TEXT NOT NULL, -- UUID as text
  action TEXT NOT NULL, -- 'INSERT', 'UPDATE', 'DELETE'

  -- Changes
  old_data JSONB,
  new_data JSONB,
  changed_fields TEXT[], -- Array of field names that changed

  -- Who and when
  changed_by UUID REFERENCES users(id),
  changed_at TIMESTAMPTZ DEFAULT NOW(),

  -- Context
  ip_address INET,
  user_agent TEXT
);

CREATE INDEX idx_audit_log_table_record ON audit_log(table_name, record_id);
CREATE INDEX idx_audit_log_changed_by ON audit_log(changed_by);
CREATE INDEX idx_audit_log_changed_at ON audit_log(changed_at DESC);
CREATE INDEX idx_audit_log_action ON audit_log(action);

-- Trigger function to log changes
CREATE OR REPLACE FUNCTION log_audit_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'DELETE') THEN
    INSERT INTO audit_log (table_name, record_id, action, old_data)
    VALUES (TG_TABLE_NAME, OLD.id::TEXT, 'DELETE', row_to_json(OLD));
    RETURN OLD;
  ELSIF (TG_OP = 'UPDATE') THEN
    INSERT INTO audit_log (table_name, record_id, action, old_data, new_data)
    VALUES (TG_TABLE_NAME, NEW.id::TEXT, 'UPDATE', row_to_json(OLD), row_to_json(NEW));
    RETURN NEW;
  ELSIF (TG_OP = 'INSERT') THEN
    INSERT INTO audit_log (table_name, record_id, action, new_data)
    VALUES (TG_TABLE_NAME, NEW.id::TEXT, 'INSERT', row_to_json(NEW));
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Apply audit triggers to important tables
CREATE TRIGGER audit_trips
AFTER INSERT OR UPDATE OR DELETE ON trips
FOR EACH ROW EXECUTE FUNCTION log_audit_changes();

CREATE TRIGGER audit_activities
AFTER INSERT OR UPDATE OR DELETE ON activities
FOR EACH ROW EXECUTE FUNCTION log_audit_changes();

CREATE TRIGGER audit_expenses
AFTER INSERT OR UPDATE OR DELETE ON expenses
FOR EACH ROW EXECUTE FUNCTION log_audit_changes();

CREATE TRIGGER audit_trip_members
AFTER INSERT OR UPDATE OR DELETE ON trip_members
FOR EACH ROW EXECUTE FUNCTION log_audit_changes();
```

#### Step 11: Create Updated At Triggers

```sql
-- Updated at triggers for all tables
CREATE TRIGGER activities_updated_at
BEFORE UPDATE ON activities
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER transport_alternatives_updated_at
BEFORE UPDATE ON transport_alternatives
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER expenses_updated_at
BEFORE UPDATE ON expenses
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER budgets_updated_at
BEFORE UPDATE ON budgets
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER activity_comments_updated_at
BEFORE UPDATE ON activity_comments
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

---

### Week 2: Data Migration

Create migration script to move data from old tables to new:

```sql
-- Migration: 013_migrate_to_activities.sql

-- Migrate day_locations to activities
INSERT INTO activities (
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
  CONCAT(dl.city, ', ', dl.country) as name,
  dl.location_coords,
  dl.city,
  dl.country,
  dl.country_code,
  CASE
    WHEN dl.start_time IS NOT NULL
    THEN (td.date || ' ' || dl.start_time)::TIMESTAMPTZ
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
FROM day_locations dl
JOIN trip_days td ON dl.trip_day_id = td.id;

-- Migrate saved_features to activities
INSERT INTO activities (
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
    WHEN sf.feature->'properties'->>'type' = 'restaurant' THEN 'restaurant'
    WHEN sf.feature->'properties'->>'type' = 'museum' THEN 'attraction'
    WHEN sf.feature->'properties'->>'amenity' = 'restaurant' THEN 'restaurant'
    ELSE 'attraction'
  END as activity_type,
  sf.feature->'properties'->>'name' as name,
  ST_SetSRID(
    ST_MakePoint(
      (sf.feature->'geometry'->'coordinates'->>0)::FLOAT,
      (sf.feature->'geometry'->'coordinates'->>1)::FLOAT
    ),
    4326
  ) as location_coords,
  sf.feature->'properties'->>'description' as description,
  CASE
    WHEN sf.start_time IS NOT NULL
    THEN (td.date || ' ' || sf.start_time)::TIMESTAMPTZ
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
FROM saved_features sf
JOIN trip_days td ON sf.trip_day_id = td.id
WHERE sf.trip_day_id IS NOT NULL;

-- Verify migration
SELECT
  'day_locations' as source,
  COUNT(*) as count
FROM day_locations
UNION ALL
SELECT
  'saved_features' as source,
  COUNT(*) as count
FROM saved_features WHERE trip_day_id IS NOT NULL
UNION ALL
SELECT
  'activities (migrated)' as source,
  COUNT(*) as count
FROM activities WHERE legacy_location_id IS NOT NULL OR legacy_feature_id IS NOT NULL;
```

---

### Week 3: Core API Endpoints

Build all API endpoints (basic implementation):

**File**: `backend/src/routes/activities.ts`

```typescript
import express from "express"
import { query, pool } from "../db"

const router = express.Router()

// Create activity
router.post("/trips/:tripId/activities", async (req, res) => {
  const { tripId } = req.params
  const {
    trip_day_id,
    activity_type,
    name,
    description,
    location_coords, // {lat, lng}
    scheduled_start,
    duration_minutes,
    currency = "AUD",
    // ... other fields
  } = req.body

  try {
    const result = await query(
      `INSERT INTO activities (
        trip_id, trip_day_id, activity_type, name, description,
        location_coords, scheduled_start, duration_minutes, currency
      ) VALUES ($1, $2, $3, $4, $5, ST_SetSRID(ST_MakePoint($6, $7), 4326), $8, $9, $10)
      RETURNING *,
        ST_X(location_coords) as longitude,
        ST_Y(location_coords) as latitude`,
      [
        tripId,
        trip_day_id,
        activity_type,
        name,
        description,
        location_coords?.lng,
        location_coords?.lat,
        scheduled_start,
        duration_minutes,
        currency,
      ],
    )

    res.status(201).json(result.rows[0])
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: "Internal server error" })
  }
})

// Get activities for trip
router.get("/trips/:tripId/activities", async (req, res) => {
  const { tripId } = req.params

  try {
    const result = await query(
      `SELECT *,
        ST_X(location_coords) as longitude,
        ST_Y(location_coords) as latitude
      FROM activities
      WHERE trip_id = $1
      ORDER BY scheduled_start`,
      [tripId],
    )

    res.json(result.rows)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: "Internal server error" })
  }
})

// ... more endpoints

export default router
```

**File**: `backend/src/routes/currency.ts`

```typescript
import express from "express"
import { query } from "../db"

const router = express.Router()

// Get current rate
router.get("/rates/:from/:to", async (req, res) => {
  const { from, to } = req.params
  const { date = new Date().toISOString().split("T")[0] } = req.query

  try {
    const result = await query(`SELECT get_currency_rate($1, $2, $3) as rate`, [from, to, date])

    res.json({ rate: result.rows[0].rate })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: "Internal server error" })
  }
})

// Add/update rate
router.post("/rates", async (req, res) => {
  const { from_currency, to_currency, rate, effective_date, notes } = req.body

  try {
    const result = await query(
      `INSERT INTO currency_rates (from_currency, to_currency, rate, effective_date, notes)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (from_currency, to_currency, effective_date)
      DO UPDATE SET rate = $2, notes = $5
      RETURNING *`,
      [from_currency, to_currency, rate, effective_date, notes],
    )

    res.status(201).json(result.rows[0])
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: "Internal server error" })
  }
})

export default router
```

---

### Week 4: Optimize Marker Loading

**Task**: Fix bandwidth issue with marker loading

**File**: `backend/src/routes/markers.ts`

```typescript
import express from "express"
import { query } from "../db"

const router = express.Router()

// Optimized marker loading with mandatory bounds
router.get("/markers", async (req, res) => {
  const { path, min_lon, min_lat, max_lon, max_lat, zoom } = req.query

  if (!path) {
    return res.status(400).json({ error: "Path is required" })
  }

  // REQUIRE bounds - no more full file loading!
  if (!min_lon || !min_lat || !max_lon || !max_lat) {
    return res.status(400).json({
      error: "Bounds are required (min_lon, min_lat, max_lon, max_lat)",
    })
  }

  try {
    // Get collection properties
    const propsResult = await query("SELECT data->'properties' as properties FROM markers WHERE path = $1", [path])
    const collectionProperties = propsResult.rows[0]?.properties || {}

    // Spatial query with clustering for high zoom levels
    const shouldCluster = parseInt(zoom as string) < 12

    let queryText
    let values

    if (shouldCluster) {
      // Cluster markers for better performance
      queryText = `
        SELECT 
          jsonb_build_object(
            'type', 'Feature',
            'properties', jsonb_build_object(
              'cluster', true,
              'point_count', COUNT(*)
            ),
            'geometry', ST_AsGeoJSON(ST_Centroid(ST_Collect(geom)))::jsonb
          ) as feature
        FROM geo_features
        WHERE source_path = $1
          AND geom && ST_MakeEnvelope($2, $3, $4, $5, 4326)
        GROUP BY ST_SnapToGrid(geom, 0.01)  -- Cluster by grid
        LIMIT 1000
      `
      values = [path, Number(min_lon), Number(min_lat), Number(max_lon), Number(max_lat)]
    } else {
      // Return individual features
      queryText = `
        SELECT properties, ST_AsGeoJSON(geom) as geometry
        FROM geo_features
        WHERE source_path = $1
          AND geom && ST_MakeEnvelope($2, $3, $4, $5, 4326)
        LIMIT 1000
      `
      values = [path, Number(min_lon), Number(min_lat), Number(max_lon), Number(max_lat)]
    }

    const result = await query(queryText, values)

    const features = result.rows.map((row) => ({
      type: "Feature",
      properties: row.properties,
      geometry: JSON.parse(row.geometry),
    }))

    // Set caching headers
    res.set({
      "Cache-Control": "public, max-age=3600", // Cache for 1 hour
      ETag: `"${path}-${min_lon}-${min_lat}-${max_lon}-${max_lat}"`,
    })

    res.json({
      type: "FeatureCollection",
      properties: collectionProperties,
      features,
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: "Internal server error" })
  }
})

export default router
```

---

## Phase 2: Transport & Scheduling (Weeks 5-6)

### Week 5: Transport Alternatives

- Implement constraint validation
- Build auto-adjustment algorithm
- Add OSRM integration (free)

### Week 6: Basic Frontend

- Simple form to add transport alternatives
- Display alternatives in timeline
- Select alternative and see impact

---

## Phase 3: Expenses & Members (Weeks 7-8)

### Week 7: Backend Logic

- Implement expense splitting algorithms
- Build settlement optimization
- Add budget tracking

### Week 8: Basic Frontend

- Add expense form
- Display expense list
- Show budget dashboard

---

## Phase 4: Frontend Polish (Weeks 9-10)

- Complete timeline view
- All calendar view modes
- Drag-and-drop
- Mobile responsive design

---

## Summary of New Tables

1. ✅ `currency_rates` - Historical exchange rates
2. ✅ `activities` - Unified activity model
3. ✅ `transport_alternatives` - Transport options
4. ✅ `trip_members` - Group members
5. ✅ `activity_participants` - Who's doing what
6. ✅ `expenses` - All expenses with currency
7. ✅ `expense_splits` - Expense splitting
8. ✅ `budgets` - Budget tracking
9. ✅ `trip_photos` - Photo links (no storage)
10. ✅ `trip_shares` - Collaboration
11. ✅ `activity_comments` - Comments
12. ✅ `audit_log` - Change history

**Total: 12 new tables**

---

## Key Features Implemented

1. ✅ **Currency System** - Historical rates, trip default, dual display
2. ✅ **Optional Activities** - Parent/child relationships
3. ✅ **Member Assignment** - Trip-level defaults, activity overrides
4. ✅ **Change History** - Full audit log
5. ✅ **Photo Links** - No storage, just URLs
6. ✅ **Optimized Markers** - Mandatory bounds, clustering, caching
7. ✅ **No Redundancy** - PostGIS only, no lat/lng fields
8. ✅ **Unified Activities** - Single table, no duplication

---

**This is the definitive plan. Ready to implement!**

**Last Updated**: 2025-12-03  
**Version**: 1.0
