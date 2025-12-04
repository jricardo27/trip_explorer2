# Trip Explorer Documentation

## 📖 Reading Order

This documentation is organized numerically for easy navigation. Read in order:

### Phase 1: Understanding Current State & Planning

1. **[00_current_issues_analysis.md](00_current_issues_analysis.md)** ⭐ **START HERE**
   - Analysis of existing implementation
   - 20 identified issues (critical, medium, low priority)
   - Database design problems
   - API and frontend issues
   - Performance and security concerns

2. **[01_final_implementation_plan.md](01_final_implementation_plan.md)** ⭐ **THE PLAN**
   - Complete backend-first implementation plan
   - All database schemas with SQL
   - Currency system with historical rates
   - Member assignment system
   - Optional/alternative activities
   - Change history (audit log)
   - Optimized marker loading
   - Migration strategy
   - **This is the definitive plan to follow**

### Phase 2: Requirements & Strategy

3. **[02_requirements.md](02_requirements.md)**
   - Original feature requirements
   - User personas
   - Success metrics
   - Future enhancements

4. **[03_budget_strategy.md](03_budget_strategy.md)**
   - GCP Always Free tier deployment
   - Cost optimization ($0-10/month)
   - Free alternatives to paid APIs
   - Won't Do list (out of scope features)

### Phase 3: Detailed System Design

5. **[04_calendar_redesign.md](04_calendar_redesign.md)**
   - Unified activity model
   - 4 calendar view modes (timeline, list, map, gantt)
   - Visual timeline design
   - Comprehensive expense tracking

6. **[05_transport_system.md](05_transport_system.md)**
   - Multi-modal transport alternatives
   - Manual entry (no paid APIs)
   - Constraint validation
   - Auto-adjustment of schedules
   - Feasibility checking

7. **[06_architecture.md](06_architecture.md)**
   - System architecture diagrams
   - Data flow visualizations
   - Component hierarchy
   - Deployment architecture

---

## 🎯 Quick Start

### For Developers

1. Read [00_current_issues_analysis.md](00_current_issues_analysis.md) to understand what's wrong
2. Read [01_final_implementation_plan.md](01_final_implementation_plan.md) to see the solution
3. Start with Week 1: Create database migration `012_complete_schema_redesign.sql`
4. Copy SQL from the plan document
5. Run migration
6. Build APIs (Week 2-3)

### For Product Managers

1. Read [02_requirements.md](02_requirements.md) for feature overview
2. Read [03_budget_strategy.md](03_budget_strategy.md) for cost constraints
3. Review [01_final_implementation_plan.md](01_final_implementation_plan.md) for timeline

### For Architects

1. Read [00_current_issues_analysis.md](00_current_issues_analysis.md) for technical debt
2. Read [06_architecture.md](06_architecture.md) for system design
3. Review [01_final_implementation_plan.md](01_final_implementation_plan.md) for database schema

---

## 📋 Implementation Summary

### Key Requirements Addressed

- ✅ **Photo Links** - Users provide URLs to cloud storage (no uploads)
- ✅ **Currency System** - Historical rates, trip default (AUD), dual display
- ✅ **Member Assignment** - Trip-level defaults, activity overrides
- ✅ **Optional Activities** - Show alternatives at same time slot
- ✅ **Change History** - Full audit log
- ✅ **Optimized Markers** - Mandatory bounds, clustering, caching
- ✅ **No Redundancy** - PostGIS only (no separate lat/lng fields)
- ✅ **Backend-First** - All models upfront, frontend later

### Database Changes

**12 New Tables**:

1. `currency_rates` - Historical exchange rates
2. `activities` - Unified activity model (replaces day_locations + saved_features)
3. `transport_alternatives` - Transport options between activities
4. `trip_members` - Group members
5. `activity_participants` - Who's doing what
6. `expenses` - All expenses with currency support
7. `expense_splits` - Expense splitting
8. `budgets` - Budget tracking
9. `trip_photos` - Photo links (no storage)
10. `trip_shares` - Collaboration
11. `activity_comments` - Comments
12. `audit_log` - Change history

**Removed Redundancy**:

- Dropped `latitude` and `longitude` columns (use PostGIS `location_coords` only)
- Will migrate `day_locations` and `saved_features` to unified `activities` table

### Timeline

- **Week 1**: Create all database schemas
- **Week 2**: Data migration
- **Week 3**: Core API endpoints
- **Week 4**: Optimize marker loading
- **Weeks 5-6**: Transport & scheduling
- **Weeks 7-8**: Expenses & members
- **Weeks 9-10**: Frontend polish

**Total: 10 weeks**

---

## 🔑 Key Design Decisions

### 1. Currency System

- Historical rates stored in `currency_rates` table
- Each trip has `default_currency` (AUD)
- Expenses store original currency + converted amount
- New rates don't affect past trips
- UI shows both: "1 USD = 1.55 AUD"

### 2. Optional Activities

- Activities can have `parent_activity_id`
- Example: Visit park (main) with 3 alternatives (carousel, zoo, walk)
- All alternatives shown at same time slot
- User selects which one they did

### 3. Member Assignment

- Trip has list of members (trip-level)
- Activities use trip members by default (`use_default_members = TRUE`)
- Can override with custom members per activity
- `activity_participants` table tracks who's doing what

### 4. Change History

- Simple audit log (not event sourcing)
- Tracks INSERT, UPDATE, DELETE
- Stores old and new data as JSONB
- Good enough for family use
- Can see what changed and when

### 5. Photo Links

- No file uploads
- Users paste Google Photos/iCloud/Dropbox links
- `trip_photos` table stores URLs only
- Unlimited photos (depends on user's cloud plan)
- No storage costs

### 6. Optimized Markers

- **Mandatory bounds** - no more full file loading
- Clustering for high zoom levels
- Caching headers (1 hour)
- Limit 1000 features per request
- Saves bandwidth

---

## 💰 Cost Estimate

**Monthly Costs**:

- Frontend: $0 (GitHub Pages)
- Backend: $0 (App Engine free tier or Compute Engine e2-micro)
- Database: $0 (PostgreSQL on VM, no Cloud SQL)
- Storage: $0 (no photo storage, just links)
- **Total: $0/month** 🎉

**For Typical Family Use**:

- 4 people
- 2-3 trips per year
- Unlimited photos (via links)
- Comfortably within GCP free tier

---

## 🚫 Out of Scope (Won't Do)

### Paid APIs

- ❌ Google Maps Directions API
- ❌ Google Places API
- ❌ Flight status APIs
- ❌ Weather APIs
- ❌ SMS notifications

### Enterprise Features

- ❌ Real-time collaboration (WebSockets)
- ❌ Push notifications
- ❌ Video export
- ❌ AI-powered suggestions
- ❌ Social features

### Resource-Intensive

- ❌ Automatic ML route optimization
- ❌ Large-scale photo processing
- ❌ Video storage
- ❌ Real-time GPS tracking

**See [03_budget_strategy.md](03_budget_strategy.md) for full list and free alternatives**

---

## 📞 Questions?

- **Current issues?** → [00_current_issues_analysis.md](00_current_issues_analysis.md)
- **How to implement?** → [01_final_implementation_plan.md](01_final_implementation_plan.md)
- **What features?** → [02_requirements.md](02_requirements.md)
- **How much will it cost?** → [03_budget_strategy.md](03_budget_strategy.md)
- **How does calendar work?** → [04_calendar_redesign.md](04_calendar_redesign.md)
- **How does transport work?** → [05_transport_system.md](05_transport_system.md)
- **System architecture?** → [06_architecture.md](06_architecture.md)

---

**Last Updated**: 2025-12-03
**Version**: 2.0 (Final)
