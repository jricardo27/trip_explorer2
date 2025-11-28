import { query } from "../db"

// Import migrations
import { migrate as addCityUniqueConstraint } from "./addCityUniqueConstraint"
import { migrate as addGeoFeaturesTable } from "./addGeoFeaturesTable"
import { migrate as addTransportColumns } from "./addTransportColumns"
import { migrate as addUnifiedTripColumns } from "./addUnifiedTripColumns"
import { migrate as loadCities } from "./loadCities"
import { migrate as loadFeatures } from "./loadFeatures"
import { migrate as loadMarkers } from "./loadMarkers"

const MIGRATIONS = [
  { name: "loadMarkers", fn: loadMarkers },
  { name: "loadCities", fn: loadCities },
  { name: "addCityUniqueConstraint", fn: addCityUniqueConstraint },
  { name: "addTransportColumns", fn: addTransportColumns },
  { name: "addUnifiedTripColumns", fn: addUnifiedTripColumns },
  { name: "addGeoFeaturesTable", fn: addGeoFeaturesTable },
  { name: "loadFeatures", fn: loadFeatures },
]

async function runMigrations() {
  try {
    console.log("Checking migration status...")

    // Create migrations table if it doesn't exist
    await query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        applied_at TIMESTAMP DEFAULT NOW()
      );
    `)

    // Get applied migrations
    const result = await query("SELECT name FROM migrations")
    const appliedMigrations = new Set(result.rows.map((row: { name: string }) => row.name))

    for (const migration of MIGRATIONS) {
      if (!appliedMigrations.has(migration.name)) {
        console.log(`Running migration: ${migration.name}...`)
        await migration.fn()
        await query("INSERT INTO migrations (name) VALUES ($1)", [migration.name])
        console.log(`Migration ${migration.name} completed and recorded.`)
      } else {
        console.log(`Skipping ${migration.name} (already applied).`)
      }
    }

    console.log("All migrations checked.")
    process.exit(0)
  } catch (err) {
    console.error("Migration runner failed:", err)
    process.exit(1)
  }
}

runMigrations()
