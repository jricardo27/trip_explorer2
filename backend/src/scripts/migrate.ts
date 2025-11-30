import fs from "fs"
import path from "path"

import { query } from "../db"

interface Migration {
  number: number
  name: string
  filename: string
  type: "sql" | "ts"
  execute: () => Promise<void>
}

/**
 * Discovers all migration files (SQL and TypeScript) in the migrations directory
 * Expected format: NNN_migration_name.sql or NNN_migration_name.ts
 */
async function discoverMigrations(): Promise<Migration[]> {
  const migrationsDir = path.join(__dirname, "../../migrations")
  const files = fs.readdirSync(migrationsDir)

  const migrations: Migration[] = []

  // Process SQL migrations from backend/migrations/
  for (const filename of files) {
    if (!filename.endsWith(".sql")) continue

    const match = filename.match(/^(\d{3})_(.+)\.sql$/)
    if (!match) {
      console.warn(`Skipping invalid SQL migration filename: ${filename}`)
      continue
    }

    const [, numberStr, name] = match
    const number = parseInt(numberStr, 10)
    const filePath = path.join(migrationsDir, filename)
    const sql = fs.readFileSync(filePath, "utf-8")

    migrations.push({
      number,
      name,
      filename,
      type: "sql",
      execute: async () => {
        await query(sql)
      },
    })
  }

  // Process TypeScript migrations from backend/migrations/
  const tsFiles = files.filter((f) => f.endsWith(".ts"))

  for (const filename of tsFiles) {
    const match = filename.match(/^(\d{3})_(.+)\.ts$/)
    if (!match) {
      console.warn(`Skipping TypeScript migration without number prefix: ${filename}`)
      continue
    }

    const [, numberStr, name] = match
    const number = parseInt(numberStr, 10)

    try {
      // Dynamic import of the TypeScript migration
      const migrationModule = await import(path.join(migrationsDir, filename))

      if (typeof migrationModule.migrate !== "function") {
        console.warn(`Skipping ${filename}: no migrate function exported`)
        continue
      }

      migrations.push({
        number,
        name,
        filename,
        type: "ts",
        execute: migrationModule.migrate,
      })
    } catch (err) {
      console.error(`Error loading TypeScript migration ${filename}:`, err)
    }
  }

  return migrations.sort((a, b) => a.number - b.number)
}

async function runMigrations() {
  try {
    console.log("Checking migration status...")

    // Create migrations table if it doesn't exist
    await query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        number INTEGER UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        filename VARCHAR(255) NOT NULL,
        type VARCHAR(10) NOT NULL,
        applied_at TIMESTAMP DEFAULT NOW()
      );
    `)

    // Get applied migrations
    const result = await query("SELECT number, name, filename, type FROM migrations ORDER BY number")
    const appliedMigrations = new Set(result.rows.map((row: { number: number }) => row.number))

    // Discover available migrations
    const migrations = await discoverMigrations()
    console.log(`Found ${migrations.length} migration file(s)`)

    for (const migration of migrations) {
      if (!appliedMigrations.has(migration.number)) {
        console.log(`Running migration ${migration.number}: ${migration.name} (${migration.type})...`)

        try {
          // Execute the migration
          await migration.execute()

          // Record the migration
          await query("INSERT INTO migrations (number, name, filename, type) VALUES ($1, $2, $3, $4)", [
            migration.number,
            migration.name,
            migration.filename,
            migration.type,
          ])

          console.log(`✓ Migration ${migration.number} completed`)
        } catch (err) {
          console.error(`✗ Migration ${migration.number} failed:`, err)
          throw err
        }
      } else {
        console.log(`⊘ Skipping migration ${migration.number}: ${migration.name} (already applied)`)
      }
    }

    console.log("All migrations completed successfully!")
    process.exit(0)
  } catch (err) {
    console.error("Migration runner failed:", err)
    process.exit(1)
  }
}

runMigrations()
