# Trip Explorer - Complete Rewrite Specification

**Document Version:** 1.0  
**Date:** December 2025  
**Purpose:** This document provides a comprehensive specification for rewriting Trip Explorer from scratch to address fundamental architectural issues, data model problems, and accumulated technical debt.

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Current System Analysis](#current-system-analysis)
3. [Identified Problems](#identified-problems)
4. [Goals and Scope](#goals-and-scope)
5. [Proposed Architecture](#proposed-architecture)
6. [Data Model Design](#data-model-design)
7. [API Design](#api-design)
8. [Frontend Architecture](#frontend-architecture)
9. [Migration Strategy](#migration-strategy)
10. [Development Phases](#development-phases)

---

## Executive Summary

Trip Explorer has evolved from a simple POI (Point of Interest) export tool into a complex trip planning application. This evolution has resulted in:

- **Dual data models** running in parallel (legacy `day_locations`/`saved_features` vs new `activities` table)
- **Incomplete migrations** causing data inconsistency
- **Type mismatches** between frontend TypeScript interfaces and backend database schema
- **Redundant data structures** (latitude/longitude columns alongside PostGIS geometry)
- **Feature creep** without proper architectural planning
- **Inconsistent state management** in the frontend

A complete rewrite is recommended to establish a clean, maintainable foundation for future development.

---

## Current System Analysis

### Technology Stack

**Frontend:**

- React 18 with TypeScript
- Vite for build tooling
- Material-UI (MUI) for components
- Leaflet for mapping
- Context API for state management

**Backend:**

- Node.js with Express
- TypeScript
- PostgreSQL with PostGIS extension
- Raw SQL (no ORM)
- Manual migration system

### Current Features

1. **Core Features:**
   - User authentication (JWT-based)
   - Trip creation and management
   - Day-by-day itinerary planning
   - POI/feature management
   - Map visualization with Leaflet
   - Export to KML/GeoJSON/Excel
   - Trip animation

2. **Advanced Features (Partially Implemented):**
   - Activities system (hotels, restaurants, attractions)
   - Transport alternatives between activities
   - Expense tracking and splitting
   - Budget management
   - Trip members/collaboration
   - Photo management
   - Travel statistics/reports
   - Currency conversion

---

## Identified Problems

### 1. Data Model Issues

#### 1.1 Dual Data Models

**Problem:** The system maintains two parallel data structures:

**Legacy Model:**

- `day_locations` table - stores custom locations per day
- `saved_features` table - stores POIs/features per day

**New Model:**

- `activities` table - unified table for all trip activities

**Impact:**

- Frontend still uses `DayLocation` and `TripFeature` interfaces
- Backend has migration 013 to convert old data to activities, but frontend never updated
- Data can exist in both old and new tables simultaneously
- Queries must check both systems
- Updates can desync between systems

#### 1.2 Redundant Geographic Data

**Problem:** Geographic coordinates stored in multiple formats:

```sql
-- In day_locations and cities tables:
latitude DECIMAL(10, 7)
longitude DECIMAL(10, 7)
location_coords GEOMETRY(Point, 4326)  -- PostGIS
```

**Impact:**

- Migration 012 removes lat/lng columns but migration may not have run
- Code may reference either format
- Potential for data inconsistency

#### 1.3 Type Mismatches

**Frontend Interface (TripContext.tsx):**

```typescript
export interface Trip {
  id: string
  user_id: string // string type
  name: string
  start_date: string
  end_date: string
  days?: TripDay[]
  animation_config?: AnimationConfig
}
```

**Backend Schema (012_complete_schema_redesign.sql):**

```sql
CREATE TABLE trips (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,  -- UUID type, not string
  budget NUMERIC(10, 2),
  default_currency CHAR(3),
  is_completed BOOLEAN,
  is_public BOOLEAN,
  timezone TEXT,
  -- Missing from frontend interface
)
```

**Impact:**

- Frontend doesn't know about budget, currency, timezone, completion status
- Type conversions required at API boundary
- Features can't be used because frontend doesn't support them

#### 1.4 Missing Foreign Key Constraints

**Problem:** Original schema had weak referential integrity:

```sql
-- Original (000_initial_schema.sql):
trips (
  user_id TEXT NOT NULL  -- No FK constraint!
)
```

Fixed in migration 012, but caused data loss:

```sql
-- Had to delete orphaned trips
DELETE FROM trips WHERE user_id NOT IN (SELECT id FROM users);
```

### 2. Migration Problems

#### 2.1 Incomplete Migration Path

**Migration 012:** Introduces complete new schema (activities, transport, expenses, etc.)
**Migration 013:** Migrates old data to activities table
**Migration 014:** Adds trip_day_details

**Problems:**

- Frontend never updated to use new schema
- No migration to remove old tables after data migration
- Both old and new systems coexist
- No rollback strategy

#### 2.2 Data Integrity Issues

From migration 013 verification:

```sql
-- Migration checks if row counts match, but doesn't verify data quality
IF activities_count != (day_locations_count + saved_features_count) THEN
  RAISE WARNING 'Row count mismatch!'
```

**Issues:**

- No validation of migrated data quality
- No verification that coordinates converted correctly
- No check for duplicate activities
- No handling of conflicting data

### 3. Frontend Architecture Issues

#### 3.1 Massive Context Provider

`TripContext.tsx` is 735 lines and manages:

- Trip CRUD operations
- Day management
- Location management
- Feature management
- Reordering logic
- Travel statistics
- Conflict detection
- Visit status tracking

**Problems:**

- Violates single responsibility principle
- Difficult to test
- Performance issues (entire context re-renders)
- Tight coupling between concerns

#### 3.2 Inconsistent State Management

**Multiple sources of truth:**

```typescript
const [trips, setTrips] = useState<Trip[]>([])
const [currentTrip, setCurrentTrip] = useState<Trip | null>(null)
const [dayFeatures, setDayFeatures] = useState<Record<string, TripFeature[]>>({})
const [dayLocations, setDayLocations] = useState<Record<string, DayLocation[]>>({})
```

**Problems:**

- `currentTrip` can be out of sync with `trips` array
- `dayFeatures` and `dayLocations` cached separately
- No cache invalidation strategy
- Race conditions on rapid updates

#### 3.3 Type Safety Issues

From AGENTS.md:

> **Avoid `any`:** Do not use `any` as a type annotation

But in TripContext.tsx:

```typescript
addFeatureToDay: (dayId: string, feature: unknown, ...) => Promise<void>
```

**Problems:**

- `unknown` used instead of proper GeoJSON types
- Properties accessed with `[key: string]: unknown`
- No runtime validation of API responses

### 4. API Design Issues

#### 4.1 Inconsistent Endpoints

**Trip Days:**

- `PUT /api/trips/:tripId/days/:dayId` - Update day
- `GET /api/trip-days/:dayId/features` - Get day features
- `POST /api/trip-days/:dayId/locations` - Add location
- `PUT /api/trip-days/:dayId/reorder` - Reorder items

**Problems:**

- Mixing `/trips/:id/days/:dayId` and `/trip-days/:dayId` patterns
- No consistent resource hierarchy
- Confusing for API consumers

#### 4.2 Missing Endpoints

Backend has routes for:

- `/api/activities/*` - Activities management
- `/api/transport/*` - Transport alternatives
- `/api/expenses/*` - Expense tracking
- `/api/budgets/*` - Budget management
- `/api/members/*` - Trip members

But frontend doesn't use any of these! Frontend still uses legacy endpoints.

#### 4.3 Over-fetching

```typescript
const fetchTripDetails = async (id: string) => {
  // Fetches entire trip with ALL locations and features
  const response = await fetch(`${API_URL}/api/trips/${id}`)
  const data = await response.json()
  // Processes allLocations and allFeatures
}
```

**Problems:**

- No pagination
- Fetches all data even if only viewing one day
- Performance degrades with large trips

### 5. Business Logic Issues

#### 5.1 Visit Status Tracking

```typescript
export interface DayLocation {
  visited?: boolean
  planned?: boolean
  // ...
}
```

**Problems:**

- Boolean flags are mutually exclusive but not enforced
- Can be both `visited: true` and `planned: true`
- Should be enum: `'planned' | 'in-progress' | 'completed' | 'skipped'`

#### 5.2 Transport Mode Handling

```typescript
export interface DayLocation {
  transport_mode?: string // Free text!
  transport_details?: string
  transport_cost?: number
  duration_minutes?: number
}
```

vs Backend:

```typescript
export interface TransportAlternative {
  transport_mode: "driving" | "walking" | "cycling" | "transit" | "flight" | "train" | "bus" | "ferry" | "other"
  // Structured with alternatives, validation, routing
}
```

**Problems:**

- Frontend uses free text, backend uses enums
- No validation
- Transport data duplicated on locations instead of being separate entities
- Can't track multiple transport options

#### 5.3 Animation Configuration

```typescript
export interface AnimationConfig {
  showName?: boolean
  showOnArrival?: boolean
  showNamesOnActiveOnly?: boolean
  zoomOnApproach?: boolean
  speed?: number
  // ... 20+ optional properties
}
```

**Problems:**

- Stored as JSONB in database (no schema validation)
- Can be attached to trips, days, locations, and features
- No defaults defined in database
- Inconsistent application of settings

### 6. Specific Bugs

#### 6.1 Day Name Persistence Bug

From conversation history (54ec1fb2):

> "Saving a day name causes the view to revert"

**Root cause:** `fetchTripDetails` triggers full reload, resetting UI state

**Attempted fix:** Added `background` parameter to prevent loading state

```typescript
const updateDay = async (dayId: string, updates: Partial<TripDay>) => {
  // ...
  await fetchTripDetails(currentTrip.id, true) // background=true
}
```

**Problem:** Workaround, not a fix. Should use optimistic updates.

#### 6.2 Reorder Race Condition

```typescript
const reorderItems = async (dayId: string, items: [...]) => {
  await fetch(`${API_URL}/api/trip-days/${dayId}/reorder`, {...})

  // Wait for database commit
  await new Promise(resolve => setTimeout(resolve, 100))

  await Promise.all([
    fetchDayLocations(dayId),
    fetchDayFeatures(dayId)
  ])
}
```

**Problems:**

- Arbitrary 100ms delay
- Race condition if database takes longer
- Should use optimistic updates or websockets

#### 6.3 Export File Extension Bug

From conversation history (91384251):

> "UI indicates .json file extension during export, but file is saved with .grocermator extension"

**Problem:** Mismatch between UI labels and actual export logic

#### 6.4 Past/Future Filter Not Working

From improvement_plan.md:

> "The Past and Future filters are not functional"

**Problem:** Filter logic not implemented despite UI buttons existing

---

## Goals and Scope

### Primary Goals

1. **Establish Single Source of Truth**
   - One data model for all trip data
   - Eliminate dual systems
   - Clear separation of concerns

2. **Type Safety Throughout**
   - Shared type definitions between frontend and backend
   - Runtime validation at API boundaries
   - No `any` or `unknown` types

3. **Scalable Architecture**
   - Support for large trips (100+ days, 1000+ activities)
   - Efficient data loading (pagination, lazy loading)
   - Optimistic UI updates

4. **Maintainable Codebase**
   - Clear module boundaries
   - Comprehensive testing
   - Documentation
   - Consistent patterns

5. **Feature Completeness**
   - Implement all backend features in frontend
   - Remove unused code
   - Fix all known bugs

### Out of Scope

- Mobile app development
- Real-time collaboration (websockets)
- AI trip suggestions
- Third-party integrations (booking APIs)
- Offline mode

---

## Proposed Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Frontend                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   React UI   │  │  State Mgmt  │  │  API Client  │      │
│  │  Components  │←→│  (Zustand)   │←→│   (React     │      │
│  │              │  │              │  │    Query)    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└────────────────────────────────┬────────────────────────────┘
                                 │ REST API
                                 │
┌────────────────────────────────┴────────────────────────────┐
│                         Backend                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Express    │  │   Services   │  │  Data Access │      │
│  │   Routes     │→ │   (Business  │→ │   Layer      │      │
│  │              │  │    Logic)    │  │  (Prisma)    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└────────────────────────────────┬────────────────────────────┘
                                 │
                                 │
┌────────────────────────────────┴────────────────────────────┐
│                    PostgreSQL + PostGIS                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │    Trips     │  │  Activities  │  │   Transport  │      │
│  │     Days     │  │   Expenses   │  │    Members   │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

### Key Architectural Decisions

#### 1. Use Prisma ORM

**Rationale:**

- Type-safe database access
- Automatic migrations
- Schema validation
- Better than raw SQL for maintenance

**Migration:**

```prisma
// schema.prisma
model Trip {
  id              String    @id @default(uuid())
  userId          String    @map("user_id")
  name            String
  startDate       DateTime  @map("start_date")
  endDate         DateTime  @map("end_date")
  budget          Decimal?  @db.Decimal(10, 2)
  defaultCurrency String?   @default("AUD") @map("default_currency") @db.Char(3)
  timezone        String?   @default("Australia/Sydney")
  isCompleted     Boolean   @default(false) @map("is_completed")
  isPublic        Boolean   @default(false) @map("is_public")

  user            User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  days            TripDay[]
  activities      Activity[]
  members         TripMember[]
  expenses        Expense[]

  createdAt       DateTime  @default(now()) @map("created_at")
  updatedAt       DateTime  @updatedAt @map("updated_at")

  @@map("trips")
}
```

#### 2. Use Zustand for State Management

**Rationale:**

- Simpler than Redux
- Better performance than Context API
- Built-in devtools
- TypeScript support

**Example:**

```typescript
import create from "zustand"

interface TripStore {
  trips: Trip[]
  currentTrip: Trip | null
  loading: boolean

  fetchTrips: () => Promise<void>
  setCurrentTrip: (trip: Trip) => void
  updateTrip: (id: string, updates: Partial<Trip>) => Promise<void>
}

export const useTripStore = create<TripStore>((set, get) => ({
  trips: [],
  currentTrip: null,
  loading: false,

  fetchTrips: async () => {
    set({ loading: true })
    const trips = await api.trips.list()
    set({ trips, loading: false })
  },

  setCurrentTrip: (trip) => set({ currentTrip: trip }),

  updateTrip: async (id, updates) => {
    const updated = await api.trips.update(id, updates)
    set((state) => ({
      trips: state.trips.map((t) => (t.id === id ? updated : t)),
      currentTrip: state.currentTrip?.id === id ? updated : state.currentTrip,
    }))
  },
}))
```

#### 3. Use React Query for Server State

**Rationale:**

- Automatic caching and invalidation
- Optimistic updates
- Background refetching
- Loading/error states

**Example:**

```typescript
export function useTripDetails(tripId: string) {
  return useQuery({
    queryKey: ["trip", tripId],
    queryFn: () => api.trips.get(tripId),
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

export function useUpdateTrip() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Trip> }) => api.trips.update(id, updates),
    onSuccess: (data) => {
      queryClient.invalidateQueries(["trip", data.id])
      queryClient.invalidateQueries(["trips"])
    },
  })
}
```

#### 4. Shared Type Definitions

**Rationale:**

- Single source of truth for types
- Compile-time validation
- Auto-generated from Prisma schema

**Implementation:**

```typescript
// shared/types/index.ts (generated from Prisma)
export type Trip = {
  id: string
  userId: string
  name: string
  startDate: Date
  endDate: Date
  budget: number | null
  defaultCurrency: string | null
  timezone: string | null
  isCompleted: boolean
  isPublic: boolean
  createdAt: Date
  updatedAt: Date
}

// API DTOs
export type CreateTripRequest = Pick<Trip, "name" | "startDate" | "endDate"> & {
  userId: string
}

export type UpdateTripRequest = Partial<Omit<Trip, "id" | "userId" | "createdAt" | "updatedAt">>
```

---

## Data Model Design

### Core Entities

#### 1. Users

```prisma
model User {
  id            String    @id @default(uuid())
  email         String    @unique
  passwordHash  String    @map("password_hash")
  createdAt     DateTime  @default(now()) @map("created_at")

  trips         Trip[]
  memberships   TripMember[]

  @@map("users")
}
```

#### 2. Trips

```prisma
model Trip {
  id              String    @id @default(uuid())
  userId          String    @map("user_id")
  name            String
  startDate       DateTime  @map("start_date") @db.Date
  endDate         DateTime  @map("end_date") @db.Date
  budget          Decimal?  @db.Decimal(10, 2)
  defaultCurrency String?   @default("AUD") @map("default_currency") @db.Char(3)
  timezone        String?   @default("Australia/Sydney")
  isCompleted     Boolean   @default(false) @map("is_completed")
  isPublic        Boolean   @default(false) @map("is_public")

  user            User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  days            TripDay[]
  activities      Activity[]
  members         TripMember[]
  expenses        Expense[]
  budgets         Budget[]
  photos          TripPhoto[]

  createdAt       DateTime  @default(now()) @map("created_at")
  updatedAt       DateTime  @updatedAt @map("updated_at")

  @@map("trips")
}
```

#### 3. Trip Days

```prisma
model TripDay {
  id        String    @id @default(uuid())
  tripId    String    @map("trip_id")
  dayIndex  Int       @map("day_index")
  date      DateTime  @db.Date
  name      String?
  notes     String?

  trip      Trip      @relation(fields: [tripId], references: [id], onDelete: Cascade)
  activities Activity[]

  @@unique([tripId, dayIndex])
  @@map("trip_days")
}
```

#### 4. Activities (Unified Model)

```prisma
enum ActivityType {
  ACCOMMODATION
  RESTAURANT
  ATTRACTION
  TRANSPORT
  CUSTOM
}

enum ActivityStatus {
  PLANNED
  IN_PROGRESS
  COMPLETED
  CANCELLED
  SKIPPED
}

model Activity {
  id                String         @id @default(uuid())
  tripId            String         @map("trip_id")
  tripDayId         String?        @map("trip_day_id")

  // Type & Classification
  activityType      ActivityType   @map("activity_type")
  activitySubtype   String?        @map("activity_subtype")
  category          String?

  // Basic Info
  name              String
  description       String?
  notes             String?

  // Location (PostGIS only)
  locationCoords    Unsupported("geometry(Point, 4326)")? @map("location_coords")
  address           String?
  city              String?
  country           String?
  countryCode       String?        @map("country_code") @db.Char(2)

  // Timing
  scheduledStart    DateTime?      @map("scheduled_start")
  scheduledEnd      DateTime?      @map("scheduled_end")
  actualStart       DateTime?      @map("actual_start")
  actualEnd         DateTime?      @map("actual_end")
  durationMinutes   Int?           @map("duration_minutes")
  isAllDay          Boolean        @default(false) @map("is_all_day")
  isFlexible        Boolean        @default(false) @map("is_flexible")

  // Status & Priority
  status            ActivityStatus @default(PLANNED)
  priority          String?        @default("normal")

  // Booking & Logistics
  bookingReference  String?        @map("booking_reference")
  bookingUrl        String?        @map("booking_url")
  confirmationNumber String?       @map("confirmation_number")
  requiresBooking   Boolean        @default(false) @map("requires_booking")
  bookingDeadline   DateTime?      @map("booking_deadline")

  // Contact & Hours
  phone             String?
  email             String?
  website           String?
  openingHours      Json?          @map("opening_hours")

  // Costs
  estimatedCost     Decimal?       @db.Decimal(10, 2) @map("estimated_cost")
  actualCost        Decimal?       @db.Decimal(10, 2) @map("actual_cost")
  currency          String?        @default("AUD") @db.Char(3)
  costCategory      String?        @map("cost_category")
  isPaid            Boolean        @default(false) @map("is_paid")
  paymentMethod     String?        @map("payment_method")

  // Group Management
  useDefaultMembers Boolean        @default(true) @map("use_default_members")
  isGroupActivity   Boolean        @default(true) @map("is_group_activity")

  // Metadata
  source            String?        @default("manual")
  externalId        String?        @map("external_id")
  tags              String[]

  // Relations
  trip              Trip           @relation(fields: [tripId], references: [id], onDelete: Cascade)
  tripDay           TripDay?       @relation(fields: [tripDayId], references: [id], onDelete: Cascade)
  participants      ActivityParticipant[]
  expenses          Expense[]
  photos            TripPhoto[]
  transportFrom     TransportAlternative[] @relation("FromActivity")
  transportTo       TransportAlternative[] @relation("ToActivity")

  createdAt         DateTime       @default(now()) @map("created_at")
  updatedAt         DateTime       @updatedAt @map("updated_at")

  @@map("activities")
}
```

#### 5. Transport Alternatives

```prisma
enum TransportMode {
  DRIVING
  WALKING
  CYCLING
  TRANSIT
  FLIGHT
  TRAIN
  BUS
  FERRY
  OTHER
}

model TransportAlternative {
  id                String        @id @default(uuid())
  tripId            String        @map("trip_id")
  fromActivityId    String        @map("from_activity_id")
  toActivityId      String        @map("to_activity_id")

  name              String
  transportMode     TransportMode @map("transport_mode")
  isSelected        Boolean       @default(false) @map("is_selected")

  // Timing
  durationMinutes   Int           @map("duration_minutes")
  bufferMinutes     Int           @default(0) @map("buffer_minutes")

  // Cost
  cost              Decimal?      @db.Decimal(10, 2)
  currency          String?       @default("AUD") @db.Char(3)
  costPerPerson     Boolean       @default(true) @map("cost_per_person")

  // Route
  distanceMeters    Int?          @map("distance_meters")
  routeGeometry     Unsupported("geometry(LineString, 4326)")? @map("route_geometry")
  waypoints         Json?

  // Description
  description       String?
  notes             String?
  pros              String[]
  cons              String[]

  // Booking
  requiresBooking   Boolean       @default(false) @map("requires_booking")
  bookingUrl        String?       @map("booking_url")
  bookingReference  String?       @map("booking_reference")

  // Validation
  isFeasible        Boolean       @default(true) @map("is_feasible")
  infeasibilityReason String?     @map("infeasibility_reason")

  // Relations
  trip              Trip          @relation(fields: [tripId], references: [id], onDelete: Cascade)
  fromActivity      Activity      @relation("FromActivity", fields: [fromActivityId], references: [id], onDelete: Cascade)
  toActivity        Activity      @relation("ToActivity", fields: [toActivityId], references: [id], onDelete: Cascade)

  createdAt         DateTime      @default(now()) @map("created_at")
  updatedAt         DateTime      @updatedAt @map("updated_at")

  @@unique([fromActivityId, toActivityId, isSelected])
  @@map("transport_alternatives")
}
```

#### 6. Trip Members

```prisma
enum MemberRole {
  OWNER
  EDITOR
  VIEWER
}

model TripMember {
  id          String      @id @default(uuid())
  tripId      String      @map("trip_id")
  userId      String?     @map("user_id")

  name        String
  email       String?
  role        MemberRole  @default(VIEWER)

  avatarUrl   String?     @map("avatar_url")
  color       String?

  trip        Trip        @relation(fields: [tripId], references: [id], onDelete: Cascade)
  user        User?       @relation(fields: [userId], references: [id], onDelete: SetNull)

  participants ActivityParticipant[]
  expensesPaid Expense[]  @relation("PaidBy")
  expenseSplits ExpenseSplit[]

  createdAt   DateTime    @default(now()) @map("created_at")

  @@unique([tripId, userId])
  @@map("trip_members")
}

model ActivityParticipant {
  id          String      @id @default(uuid())
  activityId  String      @map("activity_id")
  memberId    String      @map("member_id")

  activity    Activity    @relation(fields: [activityId], references: [id], onDelete: Cascade)
  member      TripMember  @relation(fields: [memberId], references: [id], onDelete: Cascade)

  createdAt   DateTime    @default(now()) @map("created_at")

  @@unique([activityId, memberId])
  @@map("activity_participants")
}
```

#### 7. Expenses & Budgets

```prisma
model Expense {
  id                    String        @id @default(uuid())
  tripId                String        @map("trip_id")
  activityId            String?       @map("activity_id")
  transportAlternativeId String?      @map("transport_alternative_id")

  description           String
  category              String
  subcategory           String?

  // Amount
  amount                Decimal       @db.Decimal(10, 2)
  currency              String        @default("AUD") @db.Char(3)
  amountInTripCurrency  Decimal?      @db.Decimal(10, 2) @map("amount_in_trip_currency")
  exchangeRate          Decimal?      @db.Decimal(10, 6) @map("exchange_rate")
  exchangeRateDate      DateTime?     @db.Date @map("exchange_rate_date")

  // Payment
  paidById              String?       @map("paid_by_id")
  paymentMethod         String?       @map("payment_method")
  paymentDate           DateTime?     @db.Date @map("payment_date")

  // Status
  isEstimated           Boolean       @default(true) @map("is_estimated")
  isPaid                Boolean       @default(false) @map("is_paid")
  isRefundable          Boolean       @default(false) @map("is_refundable")

  // Receipt
  receiptUrl            String?       @map("receipt_url")
  receiptNumber         String?       @map("receipt_number")

  // Splitting
  isShared              Boolean       @default(false) @map("is_shared")
  splitType             String        @default("equal") @map("split_type")

  tags                  String[]
  notes                 String?

  // Relations
  trip                  Trip          @relation(fields: [tripId], references: [id], onDelete: Cascade)
  activity              Activity?     @relation(fields: [activityId], references: [id], onDelete: SetNull)
  paidBy                TripMember?   @relation("PaidBy", fields: [paidById], references: [id])
  splits                ExpenseSplit[]

  createdAt             DateTime      @default(now()) @map("created_at")
  updatedAt             DateTime      @updatedAt @map("updated_at")

  @@map("expenses")
}

model ExpenseSplit {
  id          String      @id @default(uuid())
  expenseId   String      @map("expense_id")
  memberId    String      @map("member_id")

  amount      Decimal     @db.Decimal(10, 2)
  percentage  Decimal?    @db.Decimal(5, 2)
  isPaid      Boolean     @default(false) @map("is_paid")
  paidAt      DateTime?   @map("paid_at")

  expense     Expense     @relation(fields: [expenseId], references: [id], onDelete: Cascade)
  member      TripMember  @relation(fields: [memberId], references: [id], onDelete: Cascade)

  createdAt   DateTime    @default(now()) @map("created_at")

  @@unique([expenseId, memberId])
  @@map("expense_splits")
}

model Budget {
  id                      String    @id @default(uuid())
  tripId                  String    @map("trip_id")

  category                String
  amount                  Decimal   @db.Decimal(10, 2)
  currency                String    @default("AUD") @db.Char(3)
  spentAmount             Decimal   @default(0) @db.Decimal(10, 2) @map("spent_amount")
  alertThresholdPercentage Int      @default(80) @map("alert_threshold_percentage")
  alertSent               Boolean   @default(false) @map("alert_sent")
  notes                   String?

  trip                    Trip      @relation(fields: [tripId], references: [id], onDelete: Cascade)

  createdAt               DateTime  @default(now()) @map("created_at")
  updatedAt               DateTime  @updatedAt @map("updated_at")

  @@unique([tripId, category])
  @@map("budgets")
}
```

#### 8. Photos

```prisma
model TripPhoto {
  id            String    @id @default(uuid())
  tripId        String    @map("trip_id")
  activityId    String?   @map("activity_id")

  photoUrl      String    @map("photo_url")
  thumbnailUrl  String?   @map("thumbnail_url")
  caption       String?
  takenAt       DateTime? @map("taken_at")

  cloudProvider String?   @map("cloud_provider")
  cloudPhotoId  String?   @map("cloud_photo_id")

  uploadedById  String?   @map("uploaded_by_id")

  trip          Trip      @relation(fields: [tripId], references: [id], onDelete: Cascade)
  activity      Activity? @relation(fields: [activityId], references: [id], onDelete: SetNull)

  createdAt     DateTime  @default(now()) @map("created_at")

  @@map("trip_photos")
}
```

### Key Design Decisions

1. **Single Activity Model:** No more dual `day_locations` and `saved_features` tables
2. **Enums for Status:** Use proper enums instead of boolean flags or free text
3. **PostGIS Only:** Remove redundant lat/lng columns, use geometry exclusively
4. **Proper Foreign Keys:** All relationships enforced at database level
5. **Audit Trail:** `createdAt` and `updatedAt` on all mutable entities
6. **Soft Deletes:** Not implemented - use hard deletes with CASCADE for simplicity

---

## API Design

### RESTful Endpoints

#### Trips

```
GET    /api/trips                    - List user's trips
POST   /api/trips                    - Create trip
GET    /api/trips/:id                - Get trip details
PUT    /api/trips/:id                - Update trip
DELETE /api/trips/:id                - Delete trip
POST   /api/trips/:id/copy           - Copy trip
GET    /api/trips/:id/export         - Export trip (KML/GeoJSON/Excel)
```

#### Trip Days

```
GET    /api/trips/:tripId/days                  - List trip days
GET    /api/trips/:tripId/days/:dayId           - Get day details
PUT    /api/trips/:tripId/days/:dayId           - Update day
```

#### Activities

```
GET    /api/trips/:tripId/activities            - List trip activities
POST   /api/trips/:tripId/activities            - Create activity
GET    /api/trips/:tripId/activities/:id        - Get activity
PUT    /api/trips/:tripId/activities/:id        - Update activity
DELETE /api/trips/:tripId/activities/:id        - Delete activity
PUT    /api/trips/:tripId/activities/reorder    - Reorder activities
GET    /api/trips/:tripId/activities/conflicts  - Get scheduling conflicts
```

#### Transport

```
GET    /api/trips/:tripId/transport                           - List transport alternatives
POST   /api/trips/:tripId/transport                           - Create transport alternative
GET    /api/trips/:tripId/transport/:id                       - Get transport details
PUT    /api/trips/:tripId/transport/:id                       - Update transport
DELETE /api/trips/:tripId/transport/:id                       - Delete transport
PUT    /api/trips/:tripId/transport/:id/select                - Select transport option
POST   /api/trips/:tripId/transport/validate                  - Validate transport feasibility
GET    /api/trips/:tripId/transport/route                     - Get route between points
```

#### Members

```
GET    /api/trips/:tripId/members       - List trip members
POST   /api/trips/:tripId/members       - Add member
PUT    /api/trips/:tripId/members/:id   - Update member
DELETE /api/trips/:tripId/members/:id   - Remove member
```

#### Expenses

```
GET    /api/trips/:tripId/expenses            - List expenses
POST   /api/trips/:tripId/expenses            - Create expense
GET    /api/trips/:tripId/expenses/:id        - Get expense
PUT    /api/trips/:tripId/expenses/:id        - Update expense
DELETE /api/trips/:tripId/expenses/:id        - Delete expense
GET    /api/trips/:tripId/expenses/balances   - Get member balances
GET    /api/trips/:tripId/expenses/settlements - Get settlement suggestions
```

#### Budgets

```
GET    /api/trips/:tripId/budgets       - List budgets
POST   /api/trips/:tripId/budgets       - Create budget
PUT    /api/trips/:tripId/budgets/:id   - Update budget
DELETE /api/trips/:tripId/budgets/:id   - Delete budget
```

#### Photos

```
GET    /api/trips/:tripId/photos       - List photos
POST   /api/trips/:tripId/photos       - Upload photo
DELETE /api/trips/:tripId/photos/:id   - Delete photo
```

#### Reports

```
GET    /api/reports/travel-stats       - Get travel statistics
```

### Response Format

**Success:**

```json
{
  "data": { ... },
  "meta": {
    "timestamp": "2025-12-05T02:00:00Z",
    "requestId": "uuid"
  }
}
```

**Error:**

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid trip dates",
    "details": {
      "field": "endDate",
      "reason": "End date must be after start date"
    }
  },
  "meta": {
    "timestamp": "2025-12-05T02:00:00Z",
    "requestId": "uuid"
  }
}
```

### Pagination

```
GET /api/trips/:tripId/activities?page=1&limit=20&sort=scheduledStart&order=asc
```

**Response:**

```json
{
  "data": [...],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

---

## Frontend Architecture

### Component Structure

```
src/
├── components/
│   ├── trips/
│   │   ├── TripList.tsx
│   │   ├── TripCard.tsx
│   │   ├── TripForm.tsx
│   │   └── TripFilters.tsx
│   ├── activities/
│   │   ├── ActivityList.tsx
│   │   ├── ActivityCard.tsx
│   │   ├── ActivityForm.tsx
│   │   └── ActivityTimeline.tsx
│   ├── map/
│   │   ├── MapView.tsx
│   │   ├── ActivityMarker.tsx
│   │   ├── RouteLayer.tsx
│   │   └── AnimationControl.tsx
│   ├── expenses/
│   │   ├── ExpenseList.tsx
│   │   ├── ExpenseForm.tsx
│   │   ├── ExpenseSplitter.tsx
│   │   └── BalanceSheet.tsx
│   └── common/
│       ├── Button.tsx
│       ├── Input.tsx
│       ├── Modal.tsx
│       └── DatePicker.tsx
├── pages/
│   ├── TripsPage.tsx
│   ├── TripDetailPage.tsx
│   ├── CalendarPage.tsx
│   └── ReportsPage.tsx
├── hooks/
│   ├── useTrips.ts
│   ├── useActivities.ts
│   ├── useExpenses.ts
│   └── useTransport.ts
├── stores/
│   ├── tripStore.ts
│   ├── activityStore.ts
│   └── uiStore.ts
├── api/
│   ├── client.ts
│   ├── trips.ts
│   ├── activities.ts
│   └── expenses.ts
└── types/
    ├── trip.ts
    ├── activity.ts
    └── expense.ts
```

### State Management Pattern

**Server State (React Query):**

- Trip data
- Activity data
- Expense data
- User data

**Client State (Zustand):**

- UI state (modals, drawers, filters)
- Map state (zoom, center, selected markers)
- Form state (temporary, unsaved data)

**Example Hook:**

```typescript
// hooks/useActivities.ts
export function useActivities(tripId: string) {
  return useQuery({
    queryKey: ["trips", tripId, "activities"],
    queryFn: () => api.activities.list(tripId),
    staleTime: 5 * 60 * 1000,
  })
}

export function useCreateActivity(tripId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateActivityRequest) => api.activities.create(tripId, data),
    onMutate: async (newActivity) => {
      // Optimistic update
      await queryClient.cancelQueries(["trips", tripId, "activities"])
      const previous = queryClient.getQueryData(["trips", tripId, "activities"])

      queryClient.setQueryData(["trips", tripId, "activities"], (old: Activity[]) => [
        ...old,
        { ...newActivity, id: "temp-" + Date.now() },
      ])

      return { previous }
    },
    onError: (err, newActivity, context) => {
      // Rollback on error
      queryClient.setQueryData(["trips", tripId, "activities"], context?.previous)
    },
    onSettled: () => {
      queryClient.invalidateQueries(["trips", tripId, "activities"])
    },
  })
}
```

---

## Migration Strategy

### Phase 1: Database Migration

1. **Export existing data**

   ```bash
   pg_dump trip_explorer > backup.sql
   ```

2. **Create new database schema with Prisma**

   ```bash
   npx prisma migrate dev --name init
   ```

3. **Migrate data from old schema to new**
   - Write custom migration script
   - Map `day_locations` → `activities` (type: CUSTOM)
   - Map `saved_features` → `activities` (type based on properties)
   - Verify data integrity

4. **Drop old tables**

   ```sql
   DROP TABLE day_locations;
   DROP TABLE saved_features;
   ```

### Phase 2: Backend Rewrite

1. **Set up Prisma**
   - Install dependencies
   - Configure schema
   - Generate client

2. **Implement service layer**
   - TripService
   - ActivityService
   - ExpenseService
   - TransportService

3. **Implement new API routes**
   - Follow RESTful conventions
   - Add validation with Zod
   - Add error handling

4. **Write tests**
   - Unit tests for services
   - Integration tests for API

### Phase 3: Frontend Rewrite

1. **Set up new state management**
   - Install Zustand
   - Install React Query
   - Create stores

2. **Implement API client**
   - Type-safe API calls
   - Error handling
   - Request/response interceptors

3. **Rewrite components**
   - Start with core components (Trip, Activity)
   - Use new hooks
   - Remove Context API

4. **Update pages**
   - Trip list page
   - Trip detail page
   - Calendar page
   - Reports page

5. **Write tests**
   - Component tests
   - Integration tests
   - E2E tests

### Phase 4: Feature Parity

1. **Implement missing features**
   - Transport alternatives UI
   - Expense tracking UI
   - Budget management UI
   - Member management UI

2. **Fix known bugs**
   - Day name persistence
   - Reorder race conditions
   - Export file extensions
   - Past/Future filters

3. **Polish UI/UX**
   - Responsive design
   - Loading states
   - Error states
   - Empty states

### Phase 5: Deployment

1. **Set up CI/CD**
   - GitHub Actions
   - Automated tests
   - Automated deployments

2. **Deploy to staging**
   - Test with real data
   - Performance testing
   - User acceptance testing

3. **Deploy to production**
   - Gradual rollout
   - Monitor errors
   - Gather feedback

---

## Development Phases

### Phase 1: Foundation (2-3 weeks)

**Goals:**

- Set up new project structure
- Implement Prisma schema
- Migrate database
- Basic API endpoints

**Deliverables:**

- Working database with new schema
- CRUD APIs for Trips, Days, Activities
- Postman collection for testing

### Phase 2: Core Features (3-4 weeks)

**Goals:**

- Implement frontend state management
- Build core UI components
- Feature parity with current system

**Deliverables:**

- Trip list and detail pages
- Activity management
- Map visualization
- Export functionality

### Phase 3: Advanced Features (3-4 weeks)

**Goals:**

- Implement transport system
- Implement expense tracking
- Implement budget management
- Implement member management

**Deliverables:**

- Transport alternatives UI
- Expense splitting UI
- Budget tracking UI
- Member invitation system

### Phase 4: Polish & Testing (2-3 weeks)

**Goals:**

- Fix bugs
- Improve performance
- Write comprehensive tests
- Documentation

**Deliverables:**

- Bug-free application
- 80%+ test coverage
- User documentation
- Developer documentation

### Phase 5: Deployment (1 week)

**Goals:**

- Deploy to production
- Monitor and fix issues
- Gather user feedback

**Deliverables:**

- Production deployment
- Monitoring dashboard
- Feedback collection system

---

## Appendix

### Technology Recommendations

**Frontend:**

- React 18
- TypeScript 5
- Vite
- Zustand (state management)
- React Query (server state)
- Material-UI or Shadcn/ui (components)
- Leaflet (maps)
- React Hook Form (forms)
- Zod (validation)

**Backend:**

- Node.js 20+
- TypeScript 5
- Express
- Prisma (ORM)
- Zod (validation)
- Jest (testing)

**Database:**

- PostgreSQL 15+
- PostGIS extension

**DevOps:**

- Docker
- GitHub Actions
- Render/Railway/Fly.io (hosting)

### Estimated Effort

**Total:** 12-15 weeks (3-4 months)

**Team:**

- 1 Full-stack developer: 12-15 weeks
- OR 1 Backend + 1 Frontend: 8-10 weeks

### Success Metrics

1. **Performance:**
   - Page load time < 2s
   - API response time < 200ms (p95)
   - Support trips with 100+ days, 1000+ activities

2. **Quality:**
   - 0 critical bugs
   - 80%+ test coverage
   - TypeScript strict mode enabled

3. **User Experience:**
   - All current features working
   - All known bugs fixed
   - Responsive design (mobile + desktop)

4. **Maintainability:**
   - Clear code structure
   - Comprehensive documentation
   - Easy to onboard new developers

---

**End of Document**
