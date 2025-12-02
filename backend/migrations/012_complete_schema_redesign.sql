-- Migration 012: Complete Schema Redesign
-- This migration implements the complete backend-first redesign
-- Created: 2025-12-03
-- Time estimate: This is a comprehensive migration

-- ============================================
-- STEP 1: Clean Up Redundancy
-- ============================================

-- Remove redundant lat/lng columns (keep only PostGIS geometry)
ALTER TABLE day_locations DROP COLUMN IF EXISTS latitude;

ALTER TABLE day_locations DROP COLUMN IF EXISTS longitude;

ALTER TABLE cities DROP COLUMN IF EXISTS latitude;

ALTER TABLE cities DROP COLUMN IF EXISTS longitude;

-- ============================================
-- STEP 2: Fix Existing Tables
-- ============================================

-- Fix trips.user_id to be proper FK
ALTER TABLE trips
ALTER COLUMN user_id TYPE UUID USING user_id::UUID;

ALTER TABLE trips
ADD CONSTRAINT fk_trips_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE;

-- Add new columns to trips
ALTER TABLE trips
ADD COLUMN IF NOT EXISTS budget NUMERIC(10, 2),
ADD COLUMN IF NOT EXISTS default_currency CHAR(3) DEFAULT 'AUD',
ADD COLUMN IF NOT EXISTS is_completed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'Australia/Sydney';

-- ============================================
-- STEP 3: Currency System
-- ============================================

-- Currency conversion rates (historical)
CREATE TABLE IF NOT EXISTS currency_rates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    from_currency CHAR(3) NOT NULL,
    to_currency CHAR(3) NOT NULL,
    rate NUMERIC(10, 6) NOT NULL,
    effective_date DATE NOT NULL,
    source TEXT DEFAULT 'manual',
    notes TEXT,
    created_by UUID REFERENCES users (id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_rate_per_date UNIQUE (
        from_currency,
        to_currency,
        effective_date
    )
);

CREATE INDEX IF NOT EXISTS idx_currency_rates_pair ON currency_rates (from_currency, to_currency);

CREATE INDEX IF NOT EXISTS idx_currency_rates_date ON currency_rates (effective_date DESC);

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

-- Insert initial AUD rates
INSERT INTO
    currency_rates (
        from_currency,
        to_currency,
        rate,
        effective_date,
        source,
        notes
    )
VALUES (
        'USD',
        'AUD',
        1.55,
        CURRENT_DATE,
        'manual',
        'Initial rate'
    ),
    (
        'EUR',
        'AUD',
        1.65,
        CURRENT_DATE,
        'manual',
        'Initial rate'
    ),
    (
        'GBP',
        'AUD',
        1.95,
        CURRENT_DATE,
        'manual',
        'Initial rate'
    ),
    (
        'JPY',
        'AUD',
        0.0105,
        CURRENT_DATE,
        'manual',
        'Initial rate'
    ),
    (
        'NZD',
        'AUD',
        0.93,
        CURRENT_DATE,
        'manual',
        'Initial rate'
    )
ON CONFLICT (
    from_currency,
    to_currency,
    effective_date
) DO NOTHING;

-- ============================================
-- STEP 4: Unified Activities Table
-- ============================================

CREATE TABLE IF NOT EXISTS activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  trip_day_id UUID REFERENCES trip_days(id) ON DELETE CASCADE,

-- Type & Classification
activity_type TEXT NOT NULL,
activity_subtype TEXT,
category TEXT,

-- Basic Info
name TEXT NOT NULL,
description TEXT,
notes TEXT,
experience_notes TEXT,

-- Location (PostGIS only, no redundant lat/lng)
location_coords GEOMETRY (Point, 4326),
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
end_day_id UUID REFERENCES trip_days (id),

-- Status & Priority
status TEXT DEFAULT 'planned', priority TEXT DEFAULT 'normal',

-- Optional/Alternative Activities
parent_activity_id UUID REFERENCES activities (id) ON DELETE CASCADE,
is_alternative BOOLEAN DEFAULT FALSE,
alternative_group_id UUID,

-- Booking & Logistics
booking_reference TEXT,
booking_url TEXT,
confirmation_number TEXT,
requires_booking BOOLEAN DEFAULT FALSE,
booking_deadline TIMESTAMPTZ,

-- Contact & Hours
phone TEXT, email TEXT, website TEXT, opening_hours JSONB,

-- Costs (with currency support)
estimated_cost NUMERIC(10, 2),
actual_cost NUMERIC(10, 2),
currency CHAR(3) DEFAULT 'AUD',
cost_category TEXT,
is_paid BOOLEAN DEFAULT FALSE,
payment_method TEXT,

-- Group Management
use_default_members BOOLEAN DEFAULT TRUE,
is_group_activity BOOLEAN DEFAULT TRUE,

-- Metadata
source TEXT DEFAULT 'manual', external_id TEXT, tags TEXT [],

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

CREATE INDEX IF NOT EXISTS idx_activities_trip_id ON activities (trip_id);

CREATE INDEX IF NOT EXISTS idx_activities_trip_day_id ON activities (trip_day_id);

CREATE INDEX IF NOT EXISTS idx_activities_type ON activities (activity_type);

CREATE INDEX IF NOT EXISTS idx_activities_status ON activities (status);

CREATE INDEX IF NOT EXISTS idx_activities_scheduled_start ON activities (scheduled_start);

CREATE INDEX IF NOT EXISTS idx_activities_location ON activities USING GIST (location_coords);

CREATE INDEX IF NOT EXISTS idx_activities_tags ON activities USING GIN (tags);

CREATE INDEX IF NOT EXISTS idx_activities_parent ON activities (parent_activity_id)
WHERE
    parent_activity_id IS NOT NULL;

-- ============================================
-- STEP 5: Transport System
-- ============================================

CREATE TABLE IF NOT EXISTS transport_alternatives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  from_activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  to_activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,

-- Alternative Details
name TEXT NOT NULL,
transport_mode TEXT NOT NULL,
is_selected BOOLEAN DEFAULT FALSE,

-- Timing
duration_minutes INTEGER NOT NULL,
buffer_minutes INTEGER DEFAULT 0,
total_duration_minutes INTEGER GENERATED ALWAYS AS (
    duration_minutes + buffer_minutes
) STORED,

-- Availability
available_from TIME,
available_to TIME,
available_days INTEGER[],
frequency_minutes INTEGER,

-- Cost (with currency)
cost NUMERIC(10, 2),
currency CHAR(3) DEFAULT 'AUD',
cost_per_person BOOLEAN DEFAULT TRUE,

-- Route
distance_meters INTEGER,
route_geometry GEOMETRY (LineString, 4326),
waypoints JSONB,

-- Description
description TEXT, notes TEXT, pros TEXT [], cons TEXT [],

-- Booking
requires_booking BOOLEAN DEFAULT FALSE,
booking_url TEXT,
booking_reference TEXT,

-- Validation
is_feasible BOOLEAN DEFAULT TRUE, infeasibility_reason TEXT,

-- Metadata
source TEXT DEFAULT 'manual',
  confidence_score NUMERIC(3, 2),
  last_validated_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT one_selected_per_connection UNIQUE (from_activity_id, to_activity_id, is_selected) 
    WHERE is_selected = TRUE
);

CREATE INDEX IF NOT EXISTS idx_transport_alternatives_from ON transport_alternatives (from_activity_id);

CREATE INDEX IF NOT EXISTS idx_transport_alternatives_to ON transport_alternatives (to_activity_id);

CREATE INDEX IF NOT EXISTS idx_transport_alternatives_selected ON transport_alternatives (is_selected)
WHERE
    is_selected = TRUE;

CREATE INDEX IF NOT EXISTS idx_transport_alternatives_route ON transport_alternatives USING GIST (route_geometry);

-- ============================================
-- STEP 6: Member System
-- ============================================

CREATE TABLE IF NOT EXISTS trip_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,

-- Member Info
name TEXT NOT NULL, email TEXT, role TEXT DEFAULT 'member',

-- Preferences
avatar_url TEXT,
  color TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT unique_user_per_trip UNIQUE(trip_id, user_id) DEFERRABLE INITIALLY DEFERRED
);

-- Make the constraint deferrable to handle NULL user_id
ALTER TABLE trip_members
DROP CONSTRAINT IF EXISTS unique_user_per_trip;

ALTER TABLE trip_members
ADD CONSTRAINT unique_user_per_trip UNIQUE (trip_id, user_id) DEFERRABLE INITIALLY DEFERRED;

CREATE INDEX IF NOT EXISTS idx_trip_members_trip_id ON trip_members (trip_id);

CREATE INDEX IF NOT EXISTS idx_trip_members_user_id ON trip_members (user_id);

-- Activity participants
CREATE TABLE IF NOT EXISTS activity_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    activity_id UUID NOT NULL REFERENCES activities (id) ON DELETE CASCADE,
    member_id UUID NOT NULL REFERENCES trip_members (id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_participant_per_activity UNIQUE (activity_id, member_id)
);

CREATE INDEX IF NOT EXISTS idx_activity_participants_activity ON activity_participants (activity_id);

CREATE INDEX IF NOT EXISTS idx_activity_participants_member ON activity_participants (member_id);

-- ============================================
-- STEP 7: Expense System
-- ============================================

CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,

-- Association
activity_id UUID REFERENCES activities (id) ON DELETE SET NULL,
transport_alternative_id UUID REFERENCES transport_alternatives (id) ON DELETE SET NULL,

-- Basic Info
description TEXT NOT NULL,
category TEXT NOT NULL,
subcategory TEXT,

-- Amount (with currency and conversion)
amount NUMERIC(10, 2) NOT NULL,
currency CHAR(3) NOT NULL DEFAULT 'AUD',
amount_in_trip_currency NUMERIC(10, 2),
exchange_rate NUMERIC(10, 6),
exchange_rate_date DATE,

-- Payment
paid_by UUID REFERENCES trip_members (id),
payment_method TEXT,
payment_date DATE,

-- Status
is_estimated BOOLEAN DEFAULT TRUE,
is_paid BOOLEAN DEFAULT FALSE,
is_refundable BOOLEAN DEFAULT FALSE,

-- Receipt
receipt_url TEXT, receipt_number TEXT,

-- Splitting
is_shared BOOLEAN DEFAULT FALSE, split_type TEXT DEFAULT 'equal',

-- Metadata
tags TEXT[],
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_expenses_trip_id ON expenses (trip_id);

CREATE INDEX IF NOT EXISTS idx_expenses_activity_id ON expenses (activity_id);

CREATE INDEX IF NOT EXISTS idx_expenses_paid_by ON expenses (paid_by);

CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses (category);

CREATE INDEX IF NOT EXISTS idx_expenses_payment_date ON expenses (payment_date);

-- Expense splits
CREATE TABLE IF NOT EXISTS expense_splits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    expense_id UUID NOT NULL REFERENCES expenses (id) ON DELETE CASCADE,
    member_id UUID NOT NULL REFERENCES trip_members (id) ON DELETE CASCADE,
    amount NUMERIC(10, 2) NOT NULL,
    percentage NUMERIC(5, 2),
    is_paid BOOLEAN DEFAULT FALSE,
    paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_split_per_expense UNIQUE (expense_id, member_id)
);

CREATE INDEX IF NOT EXISTS idx_expense_splits_expense_id ON expense_splits (expense_id);

CREATE INDEX IF NOT EXISTS idx_expense_splits_member_id ON expense_splits (member_id);

-- Budgets
CREATE TABLE IF NOT EXISTS budgets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    trip_id UUID NOT NULL REFERENCES trips (id) ON DELETE CASCADE,
    category TEXT NOT NULL,
    amount NUMERIC(10, 2) NOT NULL,
    currency CHAR(3) NOT NULL DEFAULT 'AUD',
    spent_amount NUMERIC(10, 2) DEFAULT 0,
    remaining_amount NUMERIC(10, 2) GENERATED ALWAYS AS (amount - spent_amount) STORED,
    alert_threshold_percentage INTEGER DEFAULT 80,
    alert_sent BOOLEAN DEFAULT FALSE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_budget_per_category UNIQUE (trip_id, category)
);

CREATE INDEX IF NOT EXISTS idx_budgets_trip_id ON budgets (trip_id);

-- ============================================
-- STEP 8: Photo System (Links Only)
-- ============================================

CREATE TABLE IF NOT EXISTS trip_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  activity_id UUID REFERENCES activities(id) ON DELETE SET NULL,

-- Photo URLs (user provides)
photo_url TEXT NOT NULL, thumbnail_url TEXT,

-- Metadata
caption TEXT, taken_at TIMESTAMPTZ,

-- Cloud storage info
cloud_provider TEXT, cloud_photo_id TEXT,

-- Uploaded by
uploaded_by UUID REFERENCES users(id),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT valid_photo_url CHECK (photo_url ~ '^https?://')
);

CREATE INDEX IF NOT EXISTS idx_trip_photos_trip_id ON trip_photos (trip_id);

CREATE INDEX IF NOT EXISTS idx_trip_photos_activity_id ON trip_photos (activity_id);

CREATE INDEX IF NOT EXISTS idx_trip_photos_taken_at ON trip_photos (taken_at);

-- ============================================
-- STEP 9: Collaboration System
-- ============================================

CREATE TABLE IF NOT EXISTS trip_shares (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    trip_id UUID NOT NULL REFERENCES trips (id) ON DELETE CASCADE,
    shared_with_user_id UUID REFERENCES users (id) ON DELETE CASCADE,
    permission TEXT DEFAULT 'view',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users (id),
    CONSTRAINT unique_share_per_user UNIQUE (trip_id, shared_with_user_id)
);

CREATE INDEX IF NOT EXISTS idx_trip_shares_trip_id ON trip_shares (trip_id);

CREATE INDEX IF NOT EXISTS idx_trip_shares_user_id ON trip_shares (shared_with_user_id);

-- Activity comments
CREATE TABLE IF NOT EXISTS activity_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    activity_id UUID NOT NULL REFERENCES activities (id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    comment TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_comments_activity ON activity_comments (activity_id);

CREATE INDEX IF NOT EXISTS idx_activity_comments_created_at ON activity_comments (created_at DESC);

-- ============================================
-- STEP 10: Audit Log (Change History)
-- ============================================

CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

-- What changed
table_name TEXT NOT NULL,
record_id TEXT NOT NULL,
action TEXT NOT NULL,

-- Changes
old_data JSONB, new_data JSONB, changed_fields TEXT [],

-- Who and when
changed_by UUID REFERENCES users (id),
changed_at TIMESTAMPTZ DEFAULT NOW(),

-- Context
ip_address INET, user_agent TEXT );

CREATE INDEX IF NOT EXISTS idx_audit_log_table_record ON audit_log (table_name, record_id);

CREATE INDEX IF NOT EXISTS idx_audit_log_changed_by ON audit_log (changed_by);

CREATE INDEX IF NOT EXISTS idx_audit_log_changed_at ON audit_log (changed_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log (action);

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
DROP TRIGGER IF EXISTS audit_trips ON trips;

CREATE TRIGGER audit_trips
AFTER INSERT OR UPDATE OR DELETE ON trips
FOR EACH ROW EXECUTE FUNCTION log_audit_changes();

DROP TRIGGER IF EXISTS audit_activities ON activities;

CREATE TRIGGER audit_activities
AFTER INSERT OR UPDATE OR DELETE ON activities
FOR EACH ROW EXECUTE FUNCTION log_audit_changes();

DROP TRIGGER IF EXISTS audit_expenses ON expenses;

CREATE TRIGGER audit_expenses
AFTER INSERT OR UPDATE OR DELETE ON expenses
FOR EACH ROW EXECUTE FUNCTION log_audit_changes();

DROP TRIGGER IF EXISTS audit_trip_members ON trip_members;

CREATE TRIGGER audit_trip_members
AFTER INSERT OR UPDATE OR DELETE ON trip_members
FOR EACH ROW EXECUTE FUNCTION log_audit_changes();

-- ============================================
-- STEP 11: Updated At Triggers
-- ============================================

DROP TRIGGER IF EXISTS activities_updated_at ON activities;

CREATE TRIGGER activities_updated_at
BEFORE UPDATE ON activities
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS transport_alternatives_updated_at ON transport_alternatives;

CREATE TRIGGER transport_alternatives_updated_at
BEFORE UPDATE ON transport_alternatives
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS expenses_updated_at ON expenses;

CREATE TRIGGER expenses_updated_at
BEFORE UPDATE ON expenses
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS budgets_updated_at ON budgets;

CREATE TRIGGER budgets_updated_at
BEFORE UPDATE ON budgets
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS activity_comments_updated_at ON activity_comments;

CREATE TRIGGER activity_comments_updated_at
BEFORE UPDATE ON activity_comments
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();