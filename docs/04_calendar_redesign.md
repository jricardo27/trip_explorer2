# Robust Calendar, Scheduling & Cost Tracking System - Complete Redesign

## Executive Summary

This document outlines a complete redesign of the calendar view, time scheduling, and cost tracking systems. The current implementation has fundamental limitations that prevent it from handling complex trip scenarios. This redesign eliminates backward compatibility constraints and builds a modern, scalable solution.

---

## Current System Limitations

### Calendar View Issues

1. **No visual time blocks** - Items are just listed, not positioned by time
2. **Poor drag-and-drop** - Can only move between days, not reorder within a day
3. **No conflict detection** - Can schedule overlapping activities
4. **No multi-day activities** - Can't span activities across multiple days (e.g., 3-day hotel stay)
5. **Fixed 24-hour view** - No zoom levels or view modes
6. **No activity types** - Everything looks the same (flights, hotels, activities)
7. **Poor mobile experience** - Horizontal scrolling is cumbersome
8. **No timeline visualization** - Hard to see the flow of the day

### Time Scheduling Issues

1. **Manual time entry only** - No smart scheduling or suggestions
2. **No buffer time** - Can't automatically add travel time between locations
3. **No time zone support** - Critical for international travel
4. **Inconsistent time handling** - Mix of start/end times and duration
5. **No schedule validation** - Can create impossible schedules
6. **No opening hours integration** - Can schedule visits when places are closed
7. **No travel time calculation** - Must manually estimate all travel times

### Cost Tracking Issues

1. **Single cost field** - Only tracks transport cost, not activity costs
2. **No currency support** - Everything in one currency
3. **No cost categories** - Can't distinguish between transport, food, activities, etc.
4. **No budget tracking** - No way to set or track against a budget
5. **No expense splitting** - Can't split costs among group members
6. **No actual vs. estimated** - Can't track what was actually spent
7. **No receipts** - Can't attach proof of purchase
8. **No cost summaries** - Hard to see total costs by category or day

---

## Proposed Solution: Modern Trip Planning System

### 1. Activity Type System

Create a comprehensive activity type hierarchy:

```typescript
enum ActivityType {
  // Logistics
  FLIGHT = "flight",
  TRAIN = "train",
  BUS = "bus",
  FERRY = "ferry",
  CAR_RENTAL = "car_rental",

  // Accommodation
  HOTEL = "hotel",
  HOSTEL = "hostel",
  AIRBNB = "airbnb",
  CAMPING = "camping",

  // Activities
  ATTRACTION = "attraction",
  TOUR = "tour",
  RESTAURANT = "restaurant",
  CAFE = "cafe",
  SHOPPING = "shopping",
  ENTERTAINMENT = "entertainment",
  OUTDOOR = "outdoor",
  MUSEUM = "museum",

  // Special
  FREE_TIME = "free_time",
  TRAVEL = "travel",
  CUSTOM = "custom",
}

enum ActivitySubtype {
  // For ATTRACTION
  NATIONAL_PARK = "national_park",
  LANDMARK = "landmark",
  VIEWPOINT = "viewpoint",
  BEACH = "beach",

  // For RESTAURANT
  BREAKFAST = "breakfast",
  LUNCH = "lunch",
  DINNER = "dinner",
  SNACK = "snack",

  // For TRAVEL
  DRIVING = "driving",
  WALKING = "walking",
  PUBLIC_TRANSIT = "public_transit",

  // ... more subtypes
}
```

### 2. Unified Activity Model

Replace separate `day_locations` and `saved_features` with a single `activities` table:

```sql
CREATE TABLE activities (
  -- Identity
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID REFERENCES trips(id) ON DELETE CASCADE,
  trip_day_id UUID REFERENCES trip_days(id) ON DELETE CASCADE,

  -- Type & Classification
  activity_type TEXT NOT NULL, -- ActivityType enum
  activity_subtype TEXT, -- ActivitySubtype enum
  category TEXT, -- User-defined category (e.g., "Must See", "Optional")

  -- Basic Info
  name TEXT NOT NULL,
  description TEXT,
  notes TEXT, -- Planning notes
  experience_notes TEXT, -- Post-trip notes

  -- Location
  latitude DECIMAL(10, 7),
  longitude DECIMAL(10, 7),
  location_coords GEOMETRY(Point, 4326),
  address TEXT,
  city TEXT,
  country TEXT,
  country_code CHAR(2),

  -- Timing
  scheduled_start TIMESTAMPTZ, -- Full timestamp with timezone
  scheduled_end TIMESTAMPTZ,
  actual_start TIMESTAMPTZ, -- What actually happened
  actual_end TIMESTAMPTZ,
  duration_minutes INTEGER, -- Planned duration
  actual_duration_minutes INTEGER, -- Actual duration
  is_all_day BOOLEAN DEFAULT FALSE,
  is_flexible BOOLEAN DEFAULT FALSE, -- No fixed time

  -- Multi-day support
  spans_multiple_days BOOLEAN DEFAULT FALSE,
  end_day_id UUID REFERENCES trip_days(id), -- For multi-day activities

  -- Status
  status TEXT DEFAULT 'planned', -- 'planned', 'confirmed', 'completed', 'cancelled', 'skipped'
  priority TEXT DEFAULT 'normal', -- 'must_do', 'high', 'normal', 'low', 'optional'

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
  opening_hours JSONB, -- Structured opening hours

  -- Costs
  estimated_cost NUMERIC(10, 2),
  actual_cost NUMERIC(10, 2),
  currency TEXT DEFAULT 'USD',
  cost_category TEXT, -- 'transport', 'accommodation', 'food', 'activity', 'shopping', 'other'
  is_paid BOOLEAN DEFAULT FALSE,
  payment_method TEXT,

  -- Group Management
  assigned_members UUID[], -- Array of trip_member IDs
  is_group_activity BOOLEAN DEFAULT TRUE,

  -- Metadata
  source TEXT, -- 'manual', 'imported', 'suggested', 'poi_database'
  external_id TEXT, -- ID from external source (Google Places, etc.)
  tags TEXT[], -- User-defined tags

  -- Legacy compatibility (can be removed after migration)
  legacy_feature_id INTEGER,
  legacy_location_id UUID,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_times CHECK (
    (scheduled_start IS NULL AND scheduled_end IS NULL) OR
    (scheduled_start IS NOT NULL AND scheduled_end IS NOT NULL AND scheduled_end > scheduled_start)
  ),
  CONSTRAINT valid_actual_times CHECK (
    (actual_start IS NULL AND actual_end IS NULL) OR
    (actual_start IS NOT NULL AND actual_end IS NOT NULL AND actual_end > actual_start)
  )
);

-- Indexes
CREATE INDEX idx_activities_trip_id ON activities(trip_id);
CREATE INDEX idx_activities_trip_day_id ON activities(trip_day_id);
CREATE INDEX idx_activities_type ON activities(activity_type);
CREATE INDEX idx_activities_status ON activities(status);
CREATE INDEX idx_activities_scheduled_start ON activities(scheduled_start);
CREATE INDEX idx_activities_location ON activities USING GIST(location_coords);
CREATE INDEX idx_activities_tags ON activities USING GIN(tags);
```

### 3. Travel Segments

Separate table for travel between activities:

```sql
CREATE TABLE travel_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID REFERENCES trips(id) ON DELETE CASCADE,

  -- Connection
  from_activity_id UUID REFERENCES activities(id) ON DELETE CASCADE,
  to_activity_id UUID REFERENCES activities(id) ON DELETE CASCADE,

  -- Travel Details
  transport_mode TEXT NOT NULL, -- 'car', 'walk', 'train', 'flight', etc.
  distance_meters INTEGER,
  estimated_duration_minutes INTEGER,
  actual_duration_minutes INTEGER,

  -- Route
  route_geometry GEOMETRY(LineString, 4326),
  waypoints JSONB, -- Array of intermediate points

  -- Costs
  estimated_cost NUMERIC(10, 2),
  actual_cost NUMERIC(10, 2),
  currency TEXT DEFAULT 'USD',

  -- Details
  notes TEXT,
  booking_reference TEXT, -- For trains, flights, etc.

  -- Timing
  scheduled_departure TIMESTAMPTZ,
  scheduled_arrival TIMESTAMPTZ,
  actual_departure TIMESTAMPTZ,
  actual_arrival TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_travel_segments_from ON travel_segments(from_activity_id);
CREATE INDEX idx_travel_segments_to ON travel_segments(to_activity_id);
```

### 4. Enhanced Cost Tracking

```sql
CREATE TABLE expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID REFERENCES trips(id) ON DELETE CASCADE,

  -- Association
  activity_id UUID REFERENCES activities(id) ON DELETE SET NULL,
  travel_segment_id UUID REFERENCES travel_segments(id) ON DELETE SET NULL,

  -- Basic Info
  description TEXT NOT NULL,
  category TEXT NOT NULL, -- 'transport', 'accommodation', 'food', 'activity', 'shopping', 'other'
  subcategory TEXT, -- More specific categorization

  -- Amount
  amount NUMERIC(10, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  amount_usd NUMERIC(10, 2), -- Converted amount for reporting
  exchange_rate NUMERIC(10, 6),

  -- Payment
  paid_by UUID REFERENCES trip_members(id),
  payment_method TEXT, -- 'cash', 'credit_card', 'debit_card', 'mobile_payment', 'other'
  payment_date DATE,

  -- Status
  is_estimated BOOLEAN DEFAULT TRUE,
  is_paid BOOLEAN DEFAULT FALSE,
  is_refundable BOOLEAN DEFAULT FALSE,

  -- Receipt
  receipt_url TEXT,
  receipt_number TEXT,

  -- Splitting
  is_shared BOOLEAN DEFAULT FALSE,
  split_type TEXT, -- 'equal', 'percentage', 'custom', 'none'

  -- Metadata
  tags TEXT[],
  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE expense_splits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id UUID REFERENCES expenses(id) ON DELETE CASCADE,
  member_id UUID REFERENCES trip_members(id) ON DELETE CASCADE,

  amount NUMERIC(10, 2) NOT NULL,
  percentage NUMERIC(5, 2),
  is_paid BOOLEAN DEFAULT FALSE,
  paid_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_expenses_trip_id ON expenses(trip_id);
CREATE INDEX idx_expenses_activity_id ON expenses(activity_id);
CREATE INDEX idx_expenses_paid_by ON expenses(paid_by);
CREATE INDEX idx_expense_splits_expense_id ON expense_splits(expense_id);
CREATE INDEX idx_expense_splits_member_id ON expense_splits(member_id);
```

### 5. Budget Management

```sql
CREATE TABLE budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID REFERENCES trips(id) ON DELETE CASCADE,

  -- Budget Details
  category TEXT NOT NULL, -- 'total', 'transport', 'accommodation', 'food', 'activities', 'shopping', 'other'
  amount NUMERIC(10, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',

  -- Tracking
  spent_amount NUMERIC(10, 2) DEFAULT 0,
  remaining_amount NUMERIC(10, 2),

  -- Alerts
  alert_threshold_percentage INTEGER DEFAULT 80, -- Alert when 80% spent
  alert_sent BOOLEAN DEFAULT FALSE,

  -- Metadata
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(trip_id, category)
);

CREATE INDEX idx_budgets_trip_id ON budgets(trip_id);
```

---

## Calendar View Redesign

### View Modes

#### 1. Timeline View (Primary)

Visual timeline showing activities as blocks positioned by time:

```
┌─────────────────────────────────────────────────────────────┐
│ Day 1 - Monday, Dec 4    Day 2 - Tuesday, Dec 5             │
├─────────────────────────────────────────────────────────────┤
│ 06:00 ┌──────────────┐   ┌──────────────┐                  │
│       │   Flight     │   │   Breakfast  │                  │
│ 08:00 │   AA123      │   └──────────────┘                  │
│       └──────────────┘   ┌──────────────────────────────┐  │
│ 10:00 ┌──────────────┐   │                              │  │
│       │  Hotel       │   │   City Walking Tour          │  │
│ 12:00 │  Check-in    │   │                              │  │
│       └──────────────┘   └──────────────────────────────┘  │
│ 14:00 ┌──────────────────────────────┐                     │
│       │                              │                     │
│ 16:00 │   Museum Visit               │                     │
│       │                              │                     │
│ 18:00 └──────────────────────────────┘                     │
│       ┌──────────────┐                                     │
│ 20:00 │   Dinner     │                                     │
│       └──────────────┘                                     │
└─────────────────────────────────────────────────────────────┘
```

**Features**:

- Activities positioned by actual time
- Visual duration (height = duration)
- Color-coded by type
- Drag to move time
- Resize to change duration
- Gaps show free time
- Travel segments shown as connectors

#### 2. List View

Chronological list with detailed information:

```
Day 1 - Monday, Dec 4, 2025
├─ 06:00-08:00 ✈️ Flight AA123 to New York        $450.00
│  └─ Booking: ABC123 | Seat: 12A
├─ 10:00-11:00 🏨 Hotel Check-in                  $200.00
│  └─ Hilton Midtown | Conf: XYZ789
├─ 14:00-18:00 🏛️ Metropolitan Museum             $25.00
│  └─ Must See | Pre-booked
└─ 20:00-21:30 🍽️ Dinner at Joe's Pizza          $40.00
   └─ Split with 3 people
```

#### 3. Map View

Activities plotted on map with time indicators:

- Markers color-coded by time of day
- Routes between activities
- Clustering for nearby activities
- Timeline slider to show progression

#### 4. Gantt View

Project-style view showing all activities:

```
Activity          | Mon | Tue | Wed | Thu | Fri |
──────────────────┼─────┼─────┼─────┼─────┼─────┤
Flight            │ ▓▓  │     │     │     │     │
Hotel Stay        │   ▓▓│▓▓▓▓▓│▓▓▓▓▓│▓▓▓▓▓│▓▓   │
Museum Visit      │     │ ▓▓  │     │     │     │
City Tour         │     │   ▓▓│     │     │     │
Day Trip          │     │     │▓▓▓▓▓│     │     │
Return Flight     │     │     │     │     │  ▓▓ │
```

### Calendar Features

#### Smart Scheduling

1. **Auto-arrange** - Automatically order activities by time
2. **Conflict detection** - Highlight overlapping activities
3. **Gap analysis** - Show free time and suggest activities
4. **Travel time insertion** - Automatically add travel between locations
5. **Opening hours validation** - Warn if activity is outside opening hours
6. **Buffer time** - Configurable buffer between activities

#### Drag & Drop Enhancements

1. **Time-based positioning** - Drop at specific time
2. **Duration resize** - Drag edges to change duration
3. **Multi-select** - Move multiple activities together
4. **Copy/paste** - Duplicate activities to other days
5. **Snap to grid** - Snap to 15/30/60 minute intervals

#### Visual Enhancements

1. **Color coding**:
   - By activity type (flight, hotel, attraction, etc.)
   - By status (planned, confirmed, completed)
   - By priority (must-do, optional)
   - By cost level (free, budget, expensive)
   - By assigned members (in group trips)

2. **Icons**:
   - Activity type icons
   - Status indicators (✓ completed, ⏰ upcoming, ⚠️ conflict)
   - Booking status (📋 confirmed, ❓ pending)
   - Cost indicators (💰 expensive, 💵 moderate, 🆓 free)

3. **Density modes**:
   - Compact (more days visible)
   - Comfortable (balanced)
   - Spacious (more details visible)

#### Time Management

1. **Time zones**:
   - Display in local time zone of each location
   - Show time zone changes
   - Adjust for daylight saving time

2. **Flexible scheduling**:
   - All-day activities (hotel stays)
   - Flexible time activities (no fixed time)
   - Multi-day activities (3-day camping trip)
   - Recurring activities (daily breakfast)

3. **Time calculations**:
   - Automatic end time from start + duration
   - Travel time between activities
   - Buffer time between activities
   - Total time per day

---

## Cost Tracking Redesign

### Cost Entry Interface

#### Quick Add

Simple form for fast entry:

```
┌─────────────────────────────────────┐
│ Add Expense                         │
├─────────────────────────────────────┤
│ Description: [Taxi to airport    ] │
│ Amount:      [$25.00] [USD ▼]      │
│ Category:    [Transport ▼]         │
│ Paid by:     [John ▼]              │
│ Split:       [☑] Equal split       │
│                                     │
│ [Cancel]              [Add Expense]│
└─────────────────────────────────────┘
```

#### Detailed Entry

Comprehensive form with all options:

```
┌─────────────────────────────────────────────────┐
│ Expense Details                                 │
├─────────────────────────────────────────────────┤
│ Basic Information                               │
│ ├─ Description: [Dinner at Restaurant]         │
│ ├─ Category:    [Food ▼] [Dinner ▼]           │
│ ├─ Date:        [Dec 4, 2025]                  │
│ └─ Link to:     [Activity: Dinner ▼]           │
│                                                 │
│ Amount                                          │
│ ├─ Amount:      [$120.00] [USD ▼]             │
│ ├─ Exchange:    [1.0 USD = 0.85 EUR]          │
│ └─ Converted:   [$120.00 USD]                  │
│                                                 │
│ Payment                                         │
│ ├─ Paid by:     [John ▼]                       │
│ ├─ Method:      [Credit Card ▼]                │
│ ├─ Status:      [☑] Paid                       │
│ └─ Receipt:     [📎 Upload]                    │
│                                                 │
│ Splitting                                       │
│ ├─ Split type:  [Equal ▼]                      │
│ ├─ John:        $40.00 (33.3%)                 │
│ ├─ Sarah:       $40.00 (33.3%)                 │
│ └─ Mike:        $40.00 (33.3%)                 │
│                                                 │
│ Notes                                           │
│ └─ [Great food, would recommend!]              │
│                                                 │
│ [Cancel]                      [Save Expense]   │
└─────────────────────────────────────────────────┘
```

### Cost Visualization

#### Budget Dashboard

```
┌─────────────────────────────────────────────────┐
│ Trip Budget Overview                            │
├─────────────────────────────────────────────────┤
│ Total Budget: $3,000.00                         │
│ Spent: $1,850.00 (61.7%)                       │
│ Remaining: $1,150.00                            │
│                                                 │
│ ████████████████░░░░░░░░░░░░░░░░░░░░░░         │
│                                                 │
│ By Category:                                    │
│ ┌─────────────────────────────────────────┐    │
│ │ Transport      $800  ████████░░  53%    │    │
│ │ Accommodation  $600  ██████░░░░  40%    │    │
│ │ Food           $300  ███░░░░░░░  20%    │    │
│ │ Activities     $150  █░░░░░░░░░  10%    │    │
│ └─────────────────────────────────────────┘    │
│                                                 │
│ Daily Average: $370.00                          │
│ Projected Total: $2,220.00 (under budget! ✓)   │
└─────────────────────────────────────────────────┘
```

#### Expense Timeline

```
Day 1 - $650
├─ Flight         $450  ████████████████████
├─ Hotel          $150  ██████
└─ Dinner         $50   ██

Day 2 - $420
├─ Breakfast      $20   █
├─ Museum         $25   █
├─ Lunch          $35   █
├─ Shopping       $200  ████████
└─ Dinner         $140  █████

Day 3 - $380
└─ ...
```

#### Cost Breakdown Charts

- Pie chart by category
- Bar chart by day
- Line chart showing cumulative spending
- Comparison: budget vs. actual
- Per-person breakdown

### Expense Splitting

#### Split Types

1. **Equal** - Split evenly among all members
2. **Percentage** - Custom percentages per person
3. **Custom amounts** - Specific amounts per person
4. **By item** - Split restaurant bill by who ordered what
5. **Proportional** - Based on days participated (for hotels)

#### Settlement System

```
┌─────────────────────────────────────────────────┐
│ Trip Settlements                                │
├─────────────────────────────────────────────────┤
│ Simplified Settlements:                         │
│                                                 │
│ John owes Sarah:  $125.00                      │
│ Mike owes Sarah:  $75.00                       │
│ Mike owes John:   $50.00                       │
│                                                 │
│ [Mark as Settled] [Send Reminder]              │
│                                                 │
│ Detailed Breakdown:                             │
│ ├─ Sarah paid $800, should pay $600 → +$200   │
│ ├─ John paid $550, should pay $600 → -$50     │
│ └─ Mike paid $450, should pay $600 → -$150    │
└─────────────────────────────────────────────────┘
```

---

## Frontend Component Architecture

### New Component Structure

```
src/components/
├── Calendar/
│   ├── CalendarView.tsx (main container)
│   ├── TimelineView/
│   │   ├── TimelineView.tsx
│   │   ├── TimelineDay.tsx
│   │   ├── TimelineActivity.tsx
│   │   ├── TimelineTravel.tsx
│   │   ├── TimeAxis.tsx
│   │   └── TimeGrid.tsx
│   ├── ListView/
│   │   ├── ListView.tsx
│   │   ├── DayList.tsx
│   │   └── ActivityListItem.tsx
│   ├── MapView/
│   │   ├── CalendarMapView.tsx
│   │   ├── ActivityMarkers.tsx
│   │   ├── RouteLines.tsx
│   │   └── TimelineSlider.tsx
│   ├── GanttView/
│   │   ├── GanttView.tsx
│   │   ├── GanttRow.tsx
│   │   └── GanttBar.tsx
│   └── Shared/
│       ├── ActivityCard.tsx
│       ├── ActivityIcon.tsx
│       ├── StatusBadge.tsx
│       ├── CostBadge.tsx
│       └── ConflictIndicator.tsx
│
├── Activities/
│   ├── ActivityModal.tsx (unified modal for all activity types)
│   ├── ActivityForm/
│   │   ├── BasicInfoSection.tsx
│   │   ├── TimingSection.tsx
│   │   ├── LocationSection.tsx
│   │   ├── CostSection.tsx
│   │   ├── BookingSection.tsx
│   │   ├── ParticipantsSection.tsx
│   │   └── NotesSection.tsx
│   ├── ActivityTemplates/
│   │   ├── FlightTemplate.tsx
│   │   ├── HotelTemplate.tsx
│   │   ├── RestaurantTemplate.tsx
│   │   └── AttractionTemplate.tsx
│   └── ActivityActions/
│       ├── DuplicateActivity.tsx
│       ├── MoveActivity.tsx
│       └── DeleteActivity.tsx
│
├── Expenses/
│   ├── ExpenseTracker.tsx (main dashboard)
│   ├── ExpenseList/
│   │   ├── ExpenseList.tsx
│   │   ├── ExpenseItem.tsx
│   │   └── ExpenseFilters.tsx
│   ├── ExpenseForm/
│   │   ├── QuickExpenseForm.tsx
│   │   ├── DetailedExpenseForm.tsx
│   │   └── SplitConfiguration.tsx
│   ├── BudgetDashboard/
│   │   ├── BudgetOverview.tsx
│   │   ├── BudgetProgress.tsx
│   │   ├── CategoryBreakdown.tsx
│   │   └── DailySpending.tsx
│   ├── Settlements/
│   │   ├── SettlementSummary.tsx
│   │   ├── DebtGraph.tsx
│   │   └── PaymentTracker.tsx
│   └── Visualizations/
│       ├── ExpenseCharts.tsx
│       ├── SpendingTimeline.tsx
│       └── CostComparison.tsx
│
├── Scheduling/
│   ├── SmartScheduler.tsx
│   ├── ConflictDetector.tsx
│   ├── TravelTimeCalculator.tsx
│   ├── OpeningHoursValidator.tsx
│   └── ScheduleOptimizer.tsx
│
└── TravelSegments/
    ├── TravelSegmentForm.tsx
    ├── RouteVisualizer.tsx
    └── TransportModeSelector.tsx
```

---

## Backend API Design

### Activity Endpoints

```typescript
// Create activity
POST /api/trips/:tripId/activities
Body: {
  activity_type: 'attraction',
  name: 'Eiffel Tower',
  scheduled_start: '2025-12-04T14:00:00+01:00',
  duration_minutes: 120,
  estimated_cost: 25.00,
  currency: 'EUR',
  // ... other fields
}

// Update activity
PUT /api/activities/:activityId
Body: { /* partial update */ }

// Delete activity
DELETE /api/activities/:activityId

// Get activities for trip
GET /api/trips/:tripId/activities
Query: ?start_date=2025-12-01&end_date=2025-12-10&type=attraction

// Bulk operations
POST /api/trips/:tripId/activities/bulk
Body: {
  action: 'move' | 'duplicate' | 'delete',
  activity_ids: ['id1', 'id2'],
  target_day_id: 'day-id'
}

// Smart scheduling
POST /api/trips/:tripId/activities/optimize
Body: {
  day_id: 'day-id',
  criteria: 'minimize_travel_time' | 'minimize_cost' | 'maximize_attractions'
}

// Conflict detection
GET /api/trips/:tripId/activities/conflicts
Response: [
  {
    activity1_id: 'id1',
    activity2_id: 'id2',
    conflict_type: 'time_overlap',
    severity: 'high'
  }
]
```

### Expense Endpoints

```typescript
// Create expense
POST /api/trips/:tripId/expenses
Body: {
  description: 'Dinner',
  amount: 120.00,
  currency: 'USD',
  category: 'food',
  paid_by: 'member-id',
  split_type: 'equal',
  participants: ['member1', 'member2', 'member3']
}

// Get expenses
GET /api/trips/:tripId/expenses
Query: ?category=food&start_date=2025-12-01

// Get expense summary
GET /api/trips/:tripId/expenses/summary
Response: {
  total: 1850.00,
  by_category: { transport: 800, accommodation: 600, ... },
  by_day: { '2025-12-04': 650, '2025-12-05': 420, ... },
  by_person: { 'john': 550, 'sarah': 800, ... }
}

// Get settlements
GET /api/trips/:tripId/settlements
Response: {
  settlements: [
    { from: 'john', to: 'sarah', amount: 125.00 },
    { from: 'mike', to: 'sarah', amount: 75.00 }
  ],
  balances: {
    'sarah': 200.00,
    'john': -50.00,
    'mike': -150.00
  }
}

// Mark settlement as paid
POST /api/settlements/:settlementId/pay
```

### Budget Endpoints

```typescript
// Set budget
POST /api/trips/:tripId/budgets
Body: {
  category: 'total',
  amount: 3000.00,
  currency: 'USD'
}

// Get budget status
GET /api/trips/:tripId/budgets
Response: {
  budgets: [
    {
      category: 'total',
      amount: 3000.00,
      spent: 1850.00,
      remaining: 1150.00,
      percentage_used: 61.7
    }
  ],
  alerts: [
    {
      category: 'transport',
      message: 'Over budget by $50',
      severity: 'warning'
    }
  ]
}
```

### Travel Segment Endpoints

```typescript
// Calculate travel between activities
POST /api/travel/calculate
Body: {
  from_activity_id: 'id1',
  to_activity_id: 'id2',
  transport_mode: 'car'
}
Response: {
  distance_meters: 5000,
  duration_minutes: 15,
  route_geometry: { /* GeoJSON */ },
  estimated_cost: 10.00
}

// Create travel segment
POST /api/trips/:tripId/travel-segments
Body: {
  from_activity_id: 'id1',
  to_activity_id: 'id2',
  transport_mode: 'car',
  // ... other fields
}
```

---

## Migration Strategy

### Phase 1: Database Migration

1. **Create new tables** (activities, travel_segments, expenses, budgets)
2. **Migrate existing data**:

   ```sql
   -- Migrate day_locations to activities
   INSERT INTO activities (
     trip_id, trip_day_id, activity_type, name,
     scheduled_start, duration_minutes, latitude, longitude,
     city, country, notes, legacy_location_id
   )
   SELECT
     td.trip_id, dl.trip_day_id, 'custom',
     CONCAT(dl.city, ', ', dl.country),
     CASE
       WHEN dl.start_time IS NOT NULL
       THEN (td.date || ' ' || dl.start_time)::TIMESTAMPTZ
       ELSE NULL
     END,
     dl.duration_minutes, dl.latitude, dl.longitude,
     dl.city, dl.country, dl.notes, dl.id
   FROM day_locations dl
   JOIN trip_days td ON dl.trip_day_id = td.id;

   -- Migrate saved_features to activities
   INSERT INTO activities (
     trip_id, trip_day_id, activity_type, name,
     scheduled_start, duration_minutes, latitude, longitude,
     notes, legacy_feature_id
   )
   SELECT
     td.trip_id, sf.trip_day_id,
     CASE
       WHEN sf.feature->>'properties'->>'type' = 'restaurant' THEN 'restaurant'
       WHEN sf.feature->>'properties'->>'type' = 'museum' THEN 'museum'
       ELSE 'attraction'
     END,
     sf.feature->'properties'->>'name',
     CASE
       WHEN sf.start_time IS NOT NULL
       THEN (td.date || ' ' || sf.start_time)::TIMESTAMPTZ
       ELSE NULL
     END,
     sf.duration_minutes,
     (sf.feature->'geometry'->'coordinates'->>1)::DECIMAL,
     (sf.feature->'geometry'->'coordinates'->>0)::DECIMAL,
     sf.feature->'properties'->>'notes',
     sf.id
   FROM saved_features sf
   JOIN trip_days td ON sf.trip_day_id = td.id
   WHERE sf.trip_day_id IS NOT NULL;
   ```

3. **Migrate costs**:

   ```sql
   -- Create expenses from transport costs
   INSERT INTO expenses (
     trip_id, activity_id, description, amount,
     category, is_estimated
   )
   SELECT
     a.trip_id, a.id,
     'Transport to ' || a.name,
     dl.transport_cost,
     'transport', TRUE
   FROM activities a
   JOIN day_locations dl ON a.legacy_location_id = dl.id
   WHERE dl.transport_cost IS NOT NULL;
   ```

4. **Keep legacy tables** temporarily for rollback

### Phase 2: Frontend Migration

1. **Create new components** alongside old ones
2. **Feature flag** to switch between old and new UI
3. **Gradual rollout**:
   - Week 1: New activity modal
   - Week 2: New timeline view
   - Week 3: New expense tracker
   - Week 4: Full migration

### Phase 3: Cleanup

1. **Remove feature flags**
2. **Delete old components**
3. **Drop legacy tables**:

   ```sql
   DROP TABLE day_locations;
   DROP TABLE saved_features;
   ```

---

## Key Features Summary

### Calendar Improvements

✅ Visual timeline with time-based positioning  
✅ Multiple view modes (timeline, list, map, gantt)  
✅ Drag-and-drop with time snapping  
✅ Conflict detection and warnings  
✅ Multi-day activity support  
✅ Activity type system with icons and colors  
✅ Smart scheduling and optimization  
✅ Time zone support  
✅ Opening hours validation

### Scheduling Enhancements

✅ Flexible time options (all-day, flexible, multi-day)  
✅ Automatic travel time calculation  
✅ Buffer time between activities  
✅ Schedule validation  
✅ Conflict resolution suggestions  
✅ Time zone handling  
✅ Recurring activities

### Cost Tracking Overhaul

✅ Comprehensive expense tracking  
✅ Multiple cost categories  
✅ Currency conversion  
✅ Budget management with alerts  
✅ Expense splitting with multiple methods  
✅ Settlement optimization  
✅ Receipt attachment  
✅ Visual cost analytics  
✅ Per-person and per-day breakdowns  
✅ Actual vs. estimated tracking

---

## Implementation Timeline

### Week 1-2: Database & Backend

- Create new database schema
- Implement migration scripts
- Build new API endpoints
- Write comprehensive tests

### Week 3-4: Activity System

- Build unified activity modal
- Implement activity type system
- Create activity templates
- Add smart scheduling

### Week 5-6: Calendar Views

- Build timeline view
- Implement drag-and-drop
- Add conflict detection
- Create other view modes

### Week 7-8: Expense System

- Build expense tracker
- Implement splitting logic
- Create budget dashboard
- Add visualizations

### Week 9-10: Polish & Testing

- User testing
- Bug fixes
- Performance optimization
- Documentation

---

**This redesign creates a professional, scalable trip planning system that can compete with commercial solutions while maintaining the flexibility and features your users need.**
