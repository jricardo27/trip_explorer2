# Current Implementation - Issues Analysis

## Overview

This document analyzes the existing Trip Explorer implementation to identify issues, inefficiencies, and areas for improvement before creating the final implementation plan.

---

## Critical Issues

### 1. ❌ Inefficient Marker Loading (Bandwidth Issue)

**Problem**: The current implementation loads entire GeoJSON files from the database for every map view, potentially depleting free bandwidth.

**Current Code** (`backend/src/index.ts:67-120`):

```typescript
app.get("/api/markers", async (req: Request, res: Response) => {
  // ...
  if (min_lon && min_lat && max_lon && max_lat) {
    // Uses spatial query on geo_features - GOOD
    const result = await query(queryText, values)
  } else {
    // Fallback to full file fetch - BAD!
    const result = await query("SELECT data FROM markers WHERE path = $1", [path])
    res.json(result.rows[0].data) // Returns ENTIRE file
  }
})
```

**Frontend Code** (`src/hooks/useGeoJsonMarkers.ts:42`):

```typescript
const response = await axios.get<GeoJsonCollection>("/api/markers", {
  params: {
    ...params,
    path: pathParam,
  },
})
```

**Issues**:

- When bounds are not provided, returns entire GeoJSON file
- Multiple files loaded per page (Western Australia loads 13 files!)
- Each file can be several MB
- Re-fetches on every bounds change (300ms debounce helps but not enough)
- No caching strategy
- No pagination or clustering

**Impact**:

- Can easily exceed 1 GB/day free bandwidth limit
- Slow page loads
- Poor mobile experience
- Unnecessary database load

**Solution Needed**:

- Always require bounds (make it mandatory)
- Implement tile-based loading
- Add caching headers
- Use clustering for dense areas
- Consider vector tiles for large datasets

---

### 2. ❌ Redundant Location Storage

**Problem**: Both `latitude`/`longitude` AND `location_coords` (PostGIS geometry) are stored.

**Current Schema** (`backend/migrations/000_initial_schema.sql:80-94`):

```sql
CREATE TABLE IF NOT EXISTS day_locations (
  latitude DECIMAL(10, 7),
  longitude DECIMAL(10, 7),
  location_coords GEOMETRY(Point, 4326),  -- Redundant!
  -- ...
);
```

**Same in `cities` table** (lines 32-34):

```sql
latitude DECIMAL(10, 7) NOT NULL,
longitude DECIMAL(10, 7) NOT NULL,
location_coords GEOMETRY(Point, 4326),  -- Redundant!
```

**Issues**:

- Data duplication
- Potential for inconsistency
- Extra storage space
- Must update both fields

**Solution**:

- Keep ONLY `location_coords` (PostGIS geometry)
- Use `ST_X()` and `ST_Y()` to extract lat/lng when needed
- Benefits: Single source of truth, spatial indexing, PostGIS functions

---

### 3. ❌ Dual Activity Storage (day_locations + saved_features)

**Problem**: Activities are split across two tables with overlapping fields.

**Current Tables**:

- `day_locations` - City-based locations
- `saved_features` - POI-based features

**Overlapping Fields**:
Both tables have:

- `trip_day_id`
- `visit_order`
- `transport_mode`, `transport_details`, `transport_cost`
- `duration_minutes`, `start_time`, `end_time`
- `visited`, `planned`
- `animation_config`
- `travel_time_minutes`, `is_locked`, `subtype`

**Issues**:

- Code duplication (must query both tables)
- Complex ordering logic (UNION queries)
- Inconsistent data models
- Hard to add new features (must update both tables)
- Confusing for developers

**Example of Complexity** (`backend/src/index.ts:170-179`):

```typescript
const maxOrderResult = await query(
  `SELECT MAX(vo) as max_order FROM (
    SELECT visit_order as vo FROM day_locations WHERE trip_day_id = $1
    UNION ALL
    SELECT visit_order as vo FROM saved_features WHERE trip_day_id = $1
  ) as combined_orders`,
  [trip_day_id],
)
```

**Solution**:

- Unified `activities` table (already planned)
- Single source of truth
- Simpler queries
- Easier to extend

---

### 4. ⚠️ No Currency Conversion System

**Problem**: No way to track exchange rates over time.

**Current State**:

- `transport_cost` stored as single number
- No currency field
- No historical rates
- Can't convert between currencies

**User Requirement**:

- Store conversion rates with dates
- New rates don't affect past trips
- Each trip has default currency (AUD)
- Show both original and converted amounts

**Solution Needed**:

```sql
CREATE TABLE currency_rates (
  id UUID PRIMARY KEY,
  from_currency CHAR(3),  -- 'USD'
  to_currency CHAR(3),    -- 'AUD'
  rate NUMERIC(10, 6),    -- 1.55
  effective_date DATE,    -- When this rate became effective
  created_at TIMESTAMPTZ
);

-- Trips table
ALTER TABLE trips ADD COLUMN default_currency CHAR(3) DEFAULT 'AUD';

-- Expenses table
ALTER TABLE expenses ADD COLUMN currency CHAR(3) DEFAULT 'USD';
```

---

### 5. ⚠️ No Change History

**Problem**: No audit trail of changes.

**User Question**: "Would it be a good idea to keep a history of changes?"

**Current State**:

- Only `created_at` and `updated_at` timestamps
- No record of what changed
- No record of who changed it
- Can't undo changes
- Can't see trip evolution

**Solution Options**:

**Option A: Simple Audit Log** (Recommended for family use)

```sql
CREATE TABLE audit_log (
  id UUID PRIMARY KEY,
  table_name TEXT,
  record_id TEXT,
  action TEXT,  -- 'INSERT', 'UPDATE', 'DELETE'
  old_data JSONB,
  new_data JSONB,
  changed_by UUID REFERENCES users(id),
  changed_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Option B: Event Sourcing** (Overkill for family app)

- Store all events
- Rebuild state from events
- More complex but powerful

**Recommendation**: Option A (simple audit log)

- Good enough for family use
- Easy to implement
- Can see what changed
- Minimal storage overhead

---

### 6. ⚠️ No Member Assignment System

**Problem**: Can't assign activities to specific trip members.

**Current State**:

- No `trip_members` table
- No way to track who's doing what
- No way to split group activities

**User Requirement**:

- Each trip has assigned members
- All activities use trip members by default
- Each activity can have custom member selection

**Solution**:

```sql
CREATE TABLE trip_members (
  id UUID PRIMARY KEY,
  trip_id UUID REFERENCES trips(id),
  user_id UUID REFERENCES users(id),
  name TEXT,
  role TEXT  -- 'owner', 'editor', 'viewer'
);

CREATE TABLE activity_participants (
  activity_id UUID REFERENCES activities(id),
  member_id UUID REFERENCES trip_members(id)
);

-- Activities table
ALTER TABLE activities
ADD COLUMN use_default_members BOOLEAN DEFAULT TRUE;
```

---

### 7. ⚠️ No Optional/Alternative Activities

**Problem**: Can't show multiple activities at same time slot.

**User Requirement**:

> "Would it be possible to have an `optional` activity that can be shown at the same time slot as another activity, for example if the main activity is to visit a park, an optional activity would be to ride an attraction that starts at 3pm"

**Current State**:

- `status` field: 'planned', 'confirmed', 'completed', 'cancelled', 'skipped'
- `priority` field: 'must_do', 'high', 'normal', 'low', 'optional'
- But no way to link alternatives

**Solution**:

```sql
-- Activities table
ALTER TABLE activities
ADD COLUMN parent_activity_id UUID REFERENCES activities(id),
ADD COLUMN is_alternative BOOLEAN DEFAULT FALSE,
ADD COLUMN alternative_group_id UUID;  -- Group alternatives together

-- Example:
-- Main: Visit Central Park (3pm-5pm)
-- Alt 1: Ride carousel (3pm-3:30pm) - parent_activity_id = park_id
-- Alt 2: Visit zoo (3pm-4pm) - parent_activity_id = park_id
-- Alt 3: Just walk around (3pm-5pm) - parent_activity_id = park_id
```

---

## Database Design Issues

### 8. ❌ Inconsistent ID Types

**Problem**: Mix of UUID and SERIAL for primary keys.

**Current State**:

- `users.id` - UUID ✓
- `trips.id` - UUID ✓
- `trip_days.id` - UUID ✓
- `day_locations.id` - UUID ✓
- `markers.id` - SERIAL ❌
- `saved_features.id` - SERIAL ❌
- `cities.id` - SERIAL ❌

**Issues**:

- Inconsistent
- SERIAL can run out (2.1 billion limit)
- UUIDs are better for distributed systems
- Harder to merge data

**Solution**:

- Use UUID for all new tables
- Consider migrating existing SERIAL to UUID

---

### 9. ❌ Missing Foreign Key Constraints

**Problem**: Some relationships not enforced.

**Current State**:

- `trips.user_id` is TEXT, not FK to users ❌
- Should be UUID with FK constraint

**Solution**:

```sql
ALTER TABLE trips
ALTER COLUMN user_id TYPE UUID USING user_id::UUID,
ADD CONSTRAINT fk_trips_user FOREIGN KEY (user_id) REFERENCES users(id);
```

---

### 10. ⚠️ No Soft Deletes

**Problem**: Deleted data is gone forever.

**Current State**:

- `ON DELETE CASCADE` everywhere
- No way to recover deleted trips
- No "trash" functionality

**Solution** (Optional for family use):

```sql
ALTER TABLE trips
ADD COLUMN deleted_at TIMESTAMPTZ,
ADD COLUMN deleted_by UUID REFERENCES users(id);

-- Query only non-deleted
SELECT * FROM trips WHERE deleted_at IS NULL;
```

---

## API Issues

### 11. ❌ No API Versioning

**Problem**: No way to evolve API without breaking clients.

**Current State**:

- All endpoints at `/api/*`
- No version number

**Solution**:

- Add version: `/api/v1/*`
- Allows v2 later without breaking v1

---

### 12. ❌ No Rate Limiting

**Problem**: No protection against abuse.

**Current State**:

- No rate limiting
- Could be abused
- Could exceed free tier limits

**Solution** (Simple for family use):

```typescript
import rateLimit from "express-rate-limit"

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
})

app.use("/api/", limiter)
```

---

### 13. ⚠️ No Request Validation

**Problem**: Minimal input validation.

**Current State**:

- Basic checks for required fields
- No type validation
- No sanitization

**Solution**:

- Use validation library (Zod, Joi)
- Validate all inputs
- Sanitize user data

---

## Frontend Issues

### 14. ❌ No Offline Support

**Problem**: Requires internet connection.

**Current State**:

- No service worker
- No offline caching
- No IndexedDB storage

**Solution**:

- Implement PWA
- Cache API responses
- Store data in IndexedDB
- Sync when online

---

### 15. ⚠️ No Error Boundaries

**Problem**: Errors crash entire app.

**Current State**:

- No React error boundaries
- Poor error handling

**Solution**:

- Add error boundaries
- Graceful degradation
- User-friendly error messages

---

## Performance Issues

### 16. ❌ N+1 Query Problem

**Problem**: Multiple database queries in loops.

**Example** (`backend/src/index.ts:316-333`):

```typescript
const trips = result.rows
if (trips.length > 0) {
  const tripIds = trips.map((t) => t.id)
  const daysResult = await query("SELECT id, trip_id, day_index, date FROM trip_days WHERE trip_id = ANY($1)", [
    tripIds,
  ])
  // Good - uses ANY to batch query
}
```

**This is actually GOOD** - uses `ANY` to batch queries.

But other places could be improved:

- Loading locations and features separately
- Could use JOINs instead

---

### 17. ❌ No Database Connection Pooling Limits

**Problem**: Could exhaust database connections.

**Current State**:

- Uses pg pool
- No explicit limits set

**Solution**:

```typescript
const pool = new Pool({
  max: 10, // Maximum 10 connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
})
```

---

## Security Issues

### 18. ❌ Weak Password Hashing

**Problem**: Using bcrypt with default rounds.

**Current State** (`backend/src/index.ts:20`):

```typescript
const hashedPassword = await bcrypt.hash(password, 10)
```

**Issue**: 10 rounds is minimum, should be 12-14 for better security.

**Solution**:

```typescript
const hashedPassword = await bcrypt.hash(password, 12)
```

---

### 19. ❌ No Authentication Middleware

**Problem**: No centralized auth checking.

**Current State**:

- No JWT tokens
- No session management
- No auth middleware

**Solution**:

```typescript
import jwt from "jsonwebtoken"

const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1]
  if (!token) return res.status(401).json({ error: "Unauthorized" })

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    req.user = decoded
    next()
  } catch (err) {
    res.status(401).json({ error: "Invalid token" })
  }
}

app.use("/api/trips", authMiddleware)
```

---

### 20. ❌ No CORS Configuration

**Problem**: CORS enabled for all origins.

**Current State** (`backend/src/index.ts:8,62`):

```typescript
app.use(cors()) // Allows ALL origins!
```

**Solution**:

```typescript
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
  }),
)
```

---

## Summary of Critical Issues

### Must Fix (High Priority)

1. ✅ **Inefficient marker loading** - Add mandatory bounds, caching
2. ✅ **Redundant lat/lng storage** - Use only PostGIS geometry
3. ✅ **Dual activity tables** - Migrate to unified `activities` table
4. ✅ **No currency system** - Add currency rates table
5. ✅ **No member assignment** - Add trip members and participants

### Should Fix (Medium Priority)

6. ✅ **No change history** - Add simple audit log
7. ✅ **No optional activities** - Add alternative activity support
8. ✅ **Inconsistent IDs** - Use UUID everywhere
9. ✅ **Missing FK constraints** - Fix trips.user_id
10. ✅ **No authentication** - Add JWT middleware

### Nice to Have (Low Priority)

11. ⚠️ **No API versioning** - Add /v1/
12. ⚠️ **No rate limiting** - Add basic rate limiter
13. ⚠️ **No offline support** - Implement PWA
14. ⚠️ **No error boundaries** - Add React error boundaries
15. ⚠️ **Weak password hashing** - Increase bcrypt rounds

---

## Next Steps

1. Create final implementation plan addressing all issues
2. Prioritize fixes based on impact
3. Design new database schema
4. Plan migration strategy
5. Implement backend-first approach

---

**Last Updated**: 2025-12-03  
**Version**: 1.0
