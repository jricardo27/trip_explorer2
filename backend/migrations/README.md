# Migration System

## Overview

The migration system automatically discovers and runs migration files from the `backend/migrations` directory. Migrations can be either SQL (for schema changes) or TypeScript (for data loading/complex operations).

## File Naming Convention

All migration files must follow this format:

```
NNN_migration_name.{sql|ts}
```

Where:

- `NNN` = 3-digit number (e.g., `001`, `002`, `123`)
- `migration_name` = descriptive name using underscores
- Extension = `.sql` for SQL migrations or `.ts` for TypeScript migrations

**Examples:**

- `001_load_initial_data.ts` - TypeScript data loader
- `002_create_users_table.sql` - SQL schema change
- `003_add_indexes.sql` - SQL optimization
- `004_migrate_legacy_data.ts` - TypeScript data migration

## Migration Types

### SQL Migrations (`.sql`)

Use for:

- Creating/altering tables
- Adding indexes
- Adding constraints
- Simple data updates

**Example:**

```sql
-- 005_add_user_roles.sql
ALTER TABLE users ADD COLUMN role VARCHAR(50) DEFAULT 'user';
CREATE INDEX idx_users_role ON users(role);
```

### TypeScript Migrations (`.ts`)

Use for:

- Loading data from files
- Complex data transformations
- Multi-step operations with logic
- Operations requiring external libraries

**Example:**

```typescript
// 006_load_cities.ts
import { query } from "../db"

export async function migrate() {
  // Complex data loading logic here
  const cities = await loadCitiesFromJSON()
  for (const city of cities) {
    await query("INSERT INTO cities (...) VALUES (...)", [city.data])
  }
}
```

## How It Works

1. The migration runner (`backend/src/migrations/runner.ts`) automatically discovers:
   - SQL files in `backend/migrations/`
   - TypeScript files in `backend/src/migrations/` (with number prefix)
2. Migrations are sorted by their number prefix
3. The system tracks which migrations have been applied in the `migrations` table
4. Only unapplied migrations are executed in order

## Creating a New Migration

### SQL Migration

1. Create a new SQL file in `backend/migrations/` with the next available number:

   ```sql
   -- 009_add_templates_table.sql
   CREATE TABLE templates (...);
   ```

### TypeScript Migration

1. Create a new TypeScript file in `backend/src/migrations/` with the next available number:

   ```typescript
   // 010_load_templates.ts
   import { query } from "../db"

   export async function migrate() {
     // Your migration logic
   }
   ```

2. Run migrations:

   ```bash
   cd backend
   npm run migrate
   ```

That's it! No need to modify `runner.ts`.

## Migration Table Schema

```sql
CREATE TABLE migrations (
  id SERIAL PRIMARY KEY,
  number INTEGER UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  filename VARCHAR(255) NOT NULL,
  type VARCHAR(10) NOT NULL,  -- 'sql' or 'ts'
  applied_at TIMESTAMP DEFAULT NOW()
);
```

## Current Migrations

- `001_*.ts` - Load markers (TypeScript)
- `002_*.ts` - Load cities (TypeScript)
- `003_*.sql` - Add city unique constraint
- `004_*.sql` - Add transport columns
- `005_*.sql` - Add unified trip columns
- `006_*.sql` - Add geo_features table
- `007_*.ts` - Load features (TypeScript)
- `008_*.sql` - Create trip templates table
