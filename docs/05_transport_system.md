# Multi-Modal Transport System with Alternative Routes

## Overview

This document specifies a comprehensive transport system that allows users to compare multiple transport options between activities, visualize them in the calendar timeline, and automatically validate time constraints.

---

## Core Concept

Between any two activities, there can be **multiple transport alternatives**, each with different characteristics:

- **Cost** (taxi expensive, bus cheap)
- **Duration** (taxi fast, bus slow)
- **Convenience** (direct vs. transfers)
- **Availability** (time-dependent)

The system should:

1. Show all alternatives visually in the timeline
2. Allow easy switching between options
3. Automatically adjust downstream activities when changed
4. Validate constraints (e.g., can't miss a flight)
5. Highlight infeasible options

---

## Database Schema

### Transport Alternatives Table

```sql
CREATE TABLE transport_alternatives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID REFERENCES trips(id) ON DELETE CASCADE,

  -- Connection
  from_activity_id UUID REFERENCES activities(id) ON DELETE CASCADE,
  to_activity_id UUID REFERENCES activities(id) ON DELETE CASCADE,

  -- Alternative Details
  name TEXT NOT NULL, -- e.g., "Taxi", "Express Bus", "Metro + Walk"
  transport_mode TEXT NOT NULL, -- 'taxi', 'bus', 'train', 'walk', 'car', 'uber', etc.
  is_selected BOOLEAN DEFAULT FALSE, -- Which option is currently active

  -- Timing
  duration_minutes INTEGER NOT NULL,
  buffer_minutes INTEGER DEFAULT 0, -- Extra time for safety
  total_duration_minutes INTEGER GENERATED ALWAYS AS (duration_minutes + buffer_minutes) STORED,

  -- Availability
  available_from TIME, -- e.g., bus only runs 06:00-22:00
  available_to TIME,
  available_days INTEGER[], -- Array of day numbers (0=Sunday, 1=Monday, etc.)
  frequency_minutes INTEGER, -- How often it runs (e.g., every 30 mins)

  -- Cost
  cost NUMERIC(10, 2),
  currency TEXT DEFAULT 'USD',
  cost_per_person BOOLEAN DEFAULT TRUE,

  -- Details
  distance_meters INTEGER,
  route_geometry GEOMETRY(LineString, 4326),
  waypoints JSONB, -- Intermediate stops

  -- Description
  description TEXT, -- e.g., "Take Metro Line 2, transfer at Central, then 5 min walk"
  notes TEXT,
  pros TEXT[], -- e.g., ["Cheapest", "Scenic route"]
  cons TEXT[], -- e.g., ["Requires 2 transfers", "Crowded during rush hour"]

  -- Booking
  requires_booking BOOLEAN DEFAULT FALSE,
  booking_url TEXT,
  booking_reference TEXT,

  -- Validation
  is_feasible BOOLEAN DEFAULT TRUE, -- Calculated based on time constraints
  infeasibility_reason TEXT, -- Why it's not feasible

  -- Metadata
  source TEXT DEFAULT 'manual', -- 'manual', 'google_maps', 'rome2rio', 'calculated'
  confidence_score NUMERIC(3, 2), -- 0.0-1.0, how reliable the data is
  last_validated_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT one_selected_per_connection UNIQUE (from_activity_id, to_activity_id, is_selected)
    WHERE is_selected = TRUE,
  CONSTRAINT valid_availability CHECK (
    (available_from IS NULL AND available_to IS NULL) OR
    (available_from IS NOT NULL AND available_to IS NOT NULL)
  )
);

-- Indexes
CREATE INDEX idx_transport_alternatives_from ON transport_alternatives(from_activity_id);
CREATE INDEX idx_transport_alternatives_to ON transport_alternatives(to_activity_id);
CREATE INDEX idx_transport_alternatives_selected ON transport_alternatives(is_selected) WHERE is_selected = TRUE;
CREATE INDEX idx_transport_alternatives_route ON transport_alternatives USING GIST(route_geometry);
```

### Transport Segments (Updated)

The existing `travel_segments` table represents the **selected** transport option:

```sql
-- Add reference to selected alternative
ALTER TABLE travel_segments
ADD COLUMN selected_alternative_id UUID REFERENCES transport_alternatives(id);
```

---

## Visual Design

### Timeline View with Transport Alternatives

```
┌─────────────────────────────────────────────────────────────┐
│ Day 1 - Monday, Dec 4, 2025                                 │
├─────────────────────────────────────────────────────────────┤
│ 06:00 ┌──────────────────────────────────┐                 │
│       │ ✈️ Flight AA123                  │                 │
│       │ LAX → JFK                        │                 │
│ 08:00 │ Lands: 08:15                     │                 │
│       └──────────────────────────────────┘                 │
│                                                             │
│       ┌─────────────────────────────────────────────┐      │
│       │ 🚗 Transport Options (JFK → Hotel)          │      │
│       ├─────────────────────────────────────────────┤      │
│       │ ● 🚕 Taxi         45m  $60  ✓ Selected     │      │
│       │   ○ 🚌 Express Bus  75m  $15  ⚠️ Tight     │      │
│       │   ○ 🚇 Subway+Walk  90m  $8   ❌ Too slow  │      │
│       │   ○ 🚗 Uber Black   40m  $80  ✓ Feasible   │      │
│       └─────────────────────────────────────────────┘      │
│                                                             │
│ 09:00 ┌──────────────────────────────────┐                 │
│       │ 🏨 Hilton Midtown                │                 │
│       │ Check-in: 15:00 (Early arrival)  │                 │
│ 10:00 │ Drop bags, rest                  │                 │
│       └──────────────────────────────────┘                 │
│                                                             │
│ 12:00 ┌──────────────────────────────────┐                 │
│       │ 🍽️ Lunch at Joe's Pizza         │                 │
│ 13:00 │ $15 per person                   │                 │
│       └──────────────────────────────────┘                 │
│                                                             │
│       ┌─────────────────────────────────────────────┐      │
│       │ 🚶 Transport Options (Lunch → Museum)       │      │
│       ├─────────────────────────────────────────────┤      │
│       │ ● 🚶 Walk         20m  Free ✓ Selected     │      │
│       │   ○ 🚕 Taxi       10m  $12  ✓ Feasible     │      │
│       │   ○ 🚇 Subway     15m  $3   ✓ Feasible     │      │
│       └─────────────────────────────────────────────┘      │
│                                                             │
│ 14:00 ┌──────────────────────────────────┐                 │
│       │ 🏛️ Metropolitan Museum           │                 │
│       │ Pre-booked: 14:00 (Must arrive)  │                 │
│ 18:00 │ $25 per person                   │                 │
│       └──────────────────────────────────┘                 │
└─────────────────────────────────────────────────────────────┘
```

### Expanded Transport Selector

When clicking on a transport section:

```
┌─────────────────────────────────────────────────────────────────┐
│ Transport from JFK Airport to Hilton Midtown                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ ● 🚕 Taxi (Yellow Cab)                          ✓ SELECTED     │
│   ├─ Duration: 45 minutes (+ 10 min buffer)                    │
│   ├─ Cost: $60 (estimated, varies with traffic)                │
│   ├─ Distance: 15.2 miles                                      │
│   ├─ Pros: Direct, convenient, luggage-friendly                │
│   ├─ Cons: Expensive, traffic dependent                        │
│   └─ Arrival: 09:10 ✓ On time for hotel                       │
│                                                                 │
│ ○ 🚌 Express Bus (NYC Airporter)                ⚠️ TIGHT       │
│   ├─ Duration: 75 minutes (+ 15 min buffer)                    │
│   ├─ Cost: $15 per person                                      │
│   ├─ Distance: 16.8 miles (via highway)                        │
│   ├─ Frequency: Every 30 minutes                               │
│   ├─ Pros: Cheapest option, WiFi available                     │
│   ├─ Cons: Slower, multiple stops, less luggage space          │
│   └─ Arrival: 09:45 ⚠️ Tight schedule (only 15m buffer)       │
│                                                                 │
│ ○ 🚇 Subway + Walk (AirTrain + E Line)          ❌ TOO SLOW    │
│   ├─ Duration: 90 minutes (+ 20 min buffer)                    │
│   ├─ Cost: $8.25 per person                                    │
│   ├─ Distance: 17.5 miles                                      │
│   ├─ Steps: AirTrain → Jamaica → E Train → 5 min walk         │
│   ├─ Pros: Very cheap, reliable timing                         │
│   ├─ Cons: Difficult with luggage, requires transfers          │
│   └─ Arrival: 10:05 ❌ Would delay lunch (conflicts)          │
│                                                                 │
│ ○ 🚗 Uber Black                                  ✓ FEASIBLE    │
│   ├─ Duration: 40 minutes (+ 10 min buffer)                    │
│   ├─ Cost: $80 (estimated)                                     │
│   ├─ Distance: 15.2 miles                                      │
│   ├─ Pros: Fastest, most comfortable, track driver             │
│   ├─ Cons: Most expensive, surge pricing possible              │
│   └─ Arrival: 09:05 ✓ Early arrival                           │
│                                                                 │
│ [Add Custom Option]                                            │
│                                                                 │
│ Impact of changing selection:                                  │
│ ├─ Selecting "Express Bus" would:                              │
│ │   • Delay hotel arrival by 35 minutes (09:45 instead of 09:10)│
│ │   • Push lunch start to 12:35 (if keeping 2h rest time)     │
│ │   • Still arrive at museum on time (14:00)                   │
│ │   • Save $45 per person                                      │
│ │                                                               │
│ └─ Selecting "Subway" would:                                   │
│     • Delay hotel arrival by 55 minutes (10:05 instead of 09:10)│
│     • ❌ Conflict: Would need to skip/shorten lunch            │
│     • Save $51.75 per person                                   │
│                                                                 │
│ [Cancel]                                    [Select & Update]  │
└─────────────────────────────────────────────────────────────────┘
```

### Compact View (Default)

```
┌─────────────────────────────────────────────────┐
│ 🚗 JFK → Hotel                                  │
├─────────────────────────────────────────────────┤
│ 🚕 Taxi • 45m • $60 • [3 alternatives ▼]       │
└─────────────────────────────────────────────────┘
```

### Collapsed View (Minimal)

```
08:15 ─── 🚕 45m $60 ──→ 09:10
```

---

## Constraint Validation System

### Validation Rules

```typescript
enum ConstraintType {
  HARD = "hard", // Cannot be violated (e.g., flight departure)
  SOFT = "soft", // Preferred but flexible (e.g., restaurant reservation)
  FLEXIBLE = "flexible", // No constraint (e.g., sightseeing)
}

interface ActivityConstraint {
  activity_id: string
  constraint_type: ConstraintType
  fixed_start_time?: string // If set, activity must start at this time
  fixed_end_time?: string // If set, activity must end at this time
  min_duration?: number // Minimum time needed
  max_duration?: number // Maximum time allowed
  buffer_before?: number // Required buffer before activity
  buffer_after?: number // Required buffer after activity
}
```

### Validation Algorithm

```typescript
function validateTransportAlternative(
  alternative: TransportAlternative,
  fromActivity: Activity,
  toActivity: Activity,
  downstreamActivities: Activity[],
): ValidationResult {
  // 1. Calculate arrival time
  const departureTime = fromActivity.scheduled_end || fromActivity.scheduled_start
  const arrivalTime = addMinutes(departureTime, alternative.total_duration_minutes)

  // 2. Check if arrival is before next activity's start
  const nextActivityStart = toActivity.scheduled_start
  const bufferRequired = toActivity.buffer_before || 0
  const requiredArrival = subtractMinutes(nextActivityStart, bufferRequired)

  if (arrivalTime > requiredArrival) {
    return {
      is_feasible: false,
      reason: `Arrives at ${formatTime(arrivalTime)}, but need to arrive by ${formatTime(requiredArrival)}`,
      severity: toActivity.constraint_type === "hard" ? "blocking" : "warning",
      delay_minutes: differenceInMinutes(arrivalTime, requiredArrival),
    }
  }

  // 3. Check availability constraints
  if (alternative.available_from && alternative.available_to) {
    const departureTimeOfDay = getTimeOfDay(departureTime)
    if (departureTimeOfDay < alternative.available_from || departureTimeOfDay > alternative.available_to) {
      return {
        is_feasible: false,
        reason: `Not available at ${formatTime(departureTime)}. Runs ${alternative.available_from}-${alternative.available_to}`,
        severity: "blocking",
      }
    }
  }

  // 4. Check downstream impacts
  const downstreamImpact = calculateDownstreamImpact(arrivalTime, toActivity, downstreamActivities)

  if (downstreamImpact.has_conflicts) {
    return {
      is_feasible: false,
      reason: `Would cause conflicts with: ${downstreamImpact.conflicting_activities.join(", ")}`,
      severity: "warning",
      downstream_conflicts: downstreamImpact.conflicts,
    }
  }

  // 5. All checks passed
  return {
    is_feasible: true,
    arrival_time: arrivalTime,
    buffer_time: differenceInMinutes(requiredArrival, arrivalTime),
    downstream_impact: downstreamImpact,
  }
}
```

### Visual Indicators

```typescript
// Color coding for feasibility
const FeasibilityColors = {
  FEASIBLE: "green", // ✓ All good
  TIGHT: "orange", // ⚠️ Possible but tight
  INFEASIBLE: "red", // ❌ Won't work
  CONFLICTS: "red", // ❌ Causes downstream conflicts
  UNAVAILABLE: "gray", // Not available at this time
}

// Icons
const FeasibilityIcons = {
  FEASIBLE: "✓",
  TIGHT: "⚠️",
  INFEASIBLE: "❌",
  CONFLICTS: "⚠️",
  UNAVAILABLE: "⊘",
}
```

---

## Auto-Adjustment System

### Cascade Update Logic

When a transport option is changed:

```typescript
async function updateTransportSelection(alternativeId: string, tripId: string): Promise<UpdateResult> {
  // 1. Get the alternative and related activities
  const alternative = await getTransportAlternative(alternativeId)
  const fromActivity = await getActivity(alternative.from_activity_id)
  const toActivity = await getActivity(alternative.to_activity_id)

  // 2. Calculate new arrival time
  const newArrivalTime = addMinutes(fromActivity.scheduled_end, alternative.total_duration_minutes)

  // 3. Calculate time delta
  const currentArrivalTime = toActivity.scheduled_start
  const timeDelta = differenceInMinutes(newArrivalTime, currentArrivalTime)

  if (timeDelta === 0) {
    // No change needed
    return { updated_activities: [] }
  }

  // 4. Get all downstream activities
  const downstreamActivities = await getActivitiesAfter(tripId, toActivity.scheduled_start)

  // 5. Determine which activities to shift
  const activitiesToShift = downstreamActivities.filter((activity) => {
    // Don't shift activities with hard constraints
    if (activity.constraint_type === "hard" && activity.fixed_start_time) {
      return false
    }
    // Don't shift if it's on a different day
    if (!isSameDay(activity.scheduled_start, toActivity.scheduled_start)) {
      return false
    }
    return true
  })

  // 6. Check for conflicts with hard constraints
  const hardConstraints = downstreamActivities.filter((a) => a.constraint_type === "hard" && a.fixed_start_time)

  for (const constraint of hardConstraints) {
    const newConstraintStart = addMinutes(constraint.scheduled_start, timeDelta)
    if (newConstraintStart > constraint.fixed_start_time) {
      throw new Error(`Cannot select this option: would cause ${constraint.name} to miss its fixed time`)
    }
  }

  // 7. Update all activities
  const updates = []

  // Update the arrival activity
  updates.push({
    activity_id: toActivity.id,
    scheduled_start: newArrivalTime,
    scheduled_end: addMinutes(newArrivalTime, toActivity.duration_minutes),
  })

  // Update downstream activities
  for (const activity of activitiesToShift) {
    updates.push({
      activity_id: activity.id,
      scheduled_start: addMinutes(activity.scheduled_start, timeDelta),
      scheduled_end: addMinutes(activity.scheduled_end, timeDelta),
    })
  }

  // 8. Apply updates in transaction
  await applyActivityUpdates(updates)

  // 9. Update selected alternative
  await setSelectedAlternative(alternativeId)

  return {
    updated_activities: updates,
    time_delta: timeDelta,
    affected_count: updates.length,
  }
}
```

### Update Preview

Before applying changes, show preview:

```
┌─────────────────────────────────────────────────────────────┐
│ Preview: Switching to Express Bus                          │
├─────────────────────────────────────────────────────────────┤
│ This will shift the following activities by +35 minutes:   │
│                                                             │
│ ✓ Hotel Check-in                                           │
│   Current: 09:10 → New: 09:45                             │
│                                                             │
│ ✓ Lunch at Joe's Pizza                                    │
│   Current: 12:00 → New: 12:35                             │
│                                                             │
│ ⚠️ Metropolitan Museum (Pre-booked at 14:00)              │
│   Current: 14:00 → New: 14:35                             │
│   WARNING: This is pre-booked for 14:00!                   │
│                                                             │
│ Alternative options:                                        │
│ 1. Keep museum at 14:00 (reduce rest time at hotel)       │
│ 2. Contact museum to reschedule to 14:30                  │
│ 3. Choose different transport                              │
│                                                             │
│ Cost savings: $45 per person                               │
│                                                             │
│ [Cancel]  [Adjust & Apply]  [Apply Anyway]                │
└─────────────────────────────────────────────────────────────┘
```

---

## API Endpoints

### Get Transport Alternatives

```typescript
GET /api/activities/:fromId/transport-to/:toId

Response: {
  alternatives: [
    {
      id: 'uuid',
      name: 'Taxi',
      transport_mode: 'taxi',
      duration_minutes: 45,
      buffer_minutes: 10,
      cost: 60.00,
      currency: 'USD',
      is_selected: true,
      is_feasible: true,
      feasibility: {
        status: 'feasible',
        arrival_time: '2025-12-04T09:10:00Z',
        buffer_time_minutes: 50
      },
      pros: ['Direct', 'Convenient', 'Luggage-friendly'],
      cons: ['Expensive', 'Traffic dependent']
    },
    {
      id: 'uuid',
      name: 'Express Bus',
      transport_mode: 'bus',
      duration_minutes: 75,
      buffer_minutes: 15,
      cost: 15.00,
      currency: 'USD',
      is_selected: false,
      is_feasible: true,
      feasibility: {
        status: 'tight',
        arrival_time: '2025-12-04T09:45:00Z',
        buffer_time_minutes: 15,
        warning: 'Tight schedule'
      },
      pros: ['Cheapest', 'WiFi available'],
      cons: ['Slower', 'Multiple stops']
    },
    {
      id: 'uuid',
      name: 'Subway + Walk',
      transport_mode: 'train',
      duration_minutes: 90,
      buffer_minutes: 20,
      cost: 8.25,
      currency: 'USD',
      is_selected: false,
      is_feasible: false,
      feasibility: {
        status: 'infeasible',
        arrival_time: '2025-12-04T10:05:00Z',
        reason: 'Would cause conflicts with lunch',
        conflicts: ['lunch-activity-id']
      },
      pros: ['Very cheap', 'Reliable'],
      cons: ['Difficult with luggage', 'Requires transfers']
    }
  ],
  from_activity: { /* activity details */ },
  to_activity: { /* activity details */ }
}
```

### Create Transport Alternative

```typescript
POST /api/transport-alternatives

Body: {
  from_activity_id: 'uuid',
  to_activity_id: 'uuid',
  name: 'Uber Black',
  transport_mode: 'uber',
  duration_minutes: 40,
  buffer_minutes: 10,
  cost: 80.00,
  currency: 'USD',
  description: 'Premium ride with professional driver',
  pros: ['Fastest', 'Most comfortable'],
  cons: ['Most expensive']
}

Response: {
  id: 'uuid',
  /* created alternative */
  validation: {
    is_feasible: true,
    /* validation details */
  }
}
```

### Select Transport Alternative

```typescript
POST /api/transport-alternatives/:id/select

Response: {
  selected_alternative: { /* alternative details */ },
  updates: {
    updated_activities: [
      {
        activity_id: 'uuid',
        old_start: '2025-12-04T09:10:00Z',
        new_start: '2025-12-04T09:05:00Z',
        time_delta_minutes: -5
      }
    ],
    affected_count: 3,
    total_time_delta: -5
  },
  warnings: [
    {
      type: 'early_arrival',
      message: 'Will arrive 5 minutes earlier than planned'
    }
  ]
}
```

### Calculate Route Options

```typescript
POST /api/transport/calculate-options

Body: {
  from_activity_id: 'uuid',
  to_activity_id: 'uuid',
  modes: ['taxi', 'bus', 'train', 'walk'], // Optional, defaults to all
  include_costs: true
}

Response: {
  options: [
    /* Auto-calculated alternatives from routing APIs */
  ],
  source: 'google_maps' | 'rome2rio' | 'calculated'
}
```

---

## Frontend Components

### Component Structure

```
src/components/Transport/
├── TransportAlternatives/
│   ├── TransportAlternativesPanel.tsx
│   ├── AlternativeCard.tsx
│   ├── AlternativeComparison.tsx
│   ├── FeasibilityBadge.tsx
│   └── ImpactPreview.tsx
├── TransportSelector/
│   ├── TransportSelectorModal.tsx
│   ├── AlternativesList.tsx
│   ├── AlternativeDetails.tsx
│   └── SelectionImpact.tsx
├── TransportVisualization/
│   ├── TransportConnector.tsx (timeline view)
│   ├── TransportCompact.tsx (collapsed view)
│   ├── TransportExpanded.tsx (detailed view)
│   └── RouteMap.tsx (map visualization)
└── TransportValidation/
    ├── ConstraintValidator.tsx
    ├── ConflictDetector.tsx
    └── FeasibilityChecker.tsx
```

### Timeline Integration

```typescript
// In TimelineView component
<TimelineDay>
  <ActivityBlock activity={flight} />

  <TransportAlternatives
    fromActivity={flight}
    toActivity={hotel}
    alternatives={alternatives}
    onSelect={handleSelectAlternative}
    showCompact={!isExpanded}
  />

  <ActivityBlock activity={hotel} />
</TimelineDay>
```

---

## Smart Features

### Auto-Suggest Alternatives

```typescript
async function suggestTransportAlternatives(
  fromActivity: Activity,
  toActivity: Activity,
): Promise<TransportAlternative[]> {
  const suggestions = []

  // 1. Calculate direct distance
  const distance = calculateDistance(fromActivity.location_coords, toActivity.location_coords)

  // 2. Determine appropriate modes based on distance
  if (distance < 1000) {
    // < 1km
    suggestions.push({ mode: "walk", priority: 1 }, { mode: "bike", priority: 2 }, { mode: "taxi", priority: 3 })
  } else if (distance < 5000) {
    // 1-5km
    suggestions.push(
      { mode: "taxi", priority: 1 },
      { mode: "bus", priority: 2 },
      { mode: "bike", priority: 3 },
      { mode: "walk", priority: 4 },
    )
  } else {
    // > 5km
    suggestions.push({ mode: "taxi", priority: 1 }, { mode: "train", priority: 2 }, { mode: "bus", priority: 3 })
  }

  // 3. Get routes from routing API
  const alternatives = await Promise.all(suggestions.map((s) => calculateRoute(fromActivity, toActivity, s.mode)))

  // 4. Validate each alternative
  return alternatives.map((alt) => ({
    ...alt,
    validation: validateTransportAlternative(alt, fromActivity, toActivity),
  }))
}
```

### Cost Optimization

```typescript
function findCheapestFeasibleOption(alternatives: TransportAlternative[]): TransportAlternative | null {
  const feasible = alternatives.filter((a) => a.is_feasible)
  if (feasible.length === 0) return null

  return feasible.reduce((cheapest, current) => (current.cost < cheapest.cost ? current : cheapest))
}
```

### Time Optimization

```typescript
function findFastestFeasibleOption(alternatives: TransportAlternative[]): TransportAlternative | null {
  const feasible = alternatives.filter((a) => a.is_feasible)
  if (feasible.length === 0) return null

  return feasible.reduce((fastest, current) =>
    current.total_duration_minutes < fastest.total_duration_minutes ? current : fastest,
  )
}
```

---

## User Workflows

### Workflow 1: Planning Phase

1. User adds flight activity (08:15 arrival)
2. User adds hotel activity (flexible check-in)
3. System automatically suggests transport alternatives
4. User reviews options:
   - Taxi: Fast but expensive
   - Bus: Cheap but slower
   - Subway: Cheapest but complex
5. User selects taxi (prioritizing convenience)
6. System updates hotel arrival time to 09:10

### Workflow 2: Budget Optimization

1. User reviews trip expenses
2. Notices transport costs are high
3. Opens transport alternatives for each segment
4. Switches taxi to bus where time permits
5. System validates changes and updates schedule
6. User saves $120 on transport

### Workflow 3: Time Constraint

1. User adds museum reservation at 14:00 (hard constraint)
2. User adds lunch before museum
3. User tries to select slower transport option
4. System warns: "This would make you late for museum"
5. User either:
   - Chooses faster transport
   - Moves lunch earlier
   - Cancels museum reservation

---

## Implementation Priority

### Phase 1: Core System (Week 1-2)

- ✅ Database schema for transport alternatives
- ✅ Basic CRUD API endpoints
- ✅ Simple validation logic
- ✅ Timeline display of alternatives

### Phase 2: Validation (Week 3)

- ✅ Constraint validation system
- ✅ Feasibility checking
- ✅ Conflict detection
- ✅ Visual indicators

### Phase 3: Auto-Adjustment (Week 4)

- ✅ Cascade update logic
- ✅ Impact preview
- ✅ Undo/redo support
- ✅ Batch updates

### Phase 4: Smart Features (Week 5)

- ✅ Auto-suggest alternatives
- ✅ Route calculation integration
- ✅ Cost/time optimization
- ✅ Availability checking

### Phase 5: Polish (Week 6)

- ✅ Enhanced UI/UX
- ✅ Mobile optimization
- ✅ Performance optimization
- ✅ User testing

---

## Benefits

### For Users

✅ **Compare options easily** - See all transport choices at a glance  
✅ **Make informed decisions** - Understand trade-offs (cost vs. time)  
✅ **Avoid mistakes** - System prevents scheduling conflicts  
✅ **Optimize budget** - Find cheapest feasible options  
✅ **Save time** - Automatic schedule adjustments  
✅ **Realistic planning** - Account for real-world constraints

### For Development

✅ **Structured data** - Clean separation of alternatives  
✅ **Reusable logic** - Validation system works for all transports  
✅ **Extensible** - Easy to add new transport modes  
✅ **Testable** - Clear validation rules  
✅ **Scalable** - Efficient queries with proper indexes

---

**This system transforms trip planning from guesswork into data-driven decision-making, helping users create realistic, optimized itineraries.**

**Last Updated**: 2025-12-03  
**Version**: 1.0
