import { query } from "../db"

export async function migrate() {
  try {
    console.log("Running migration: addCityUniqueConstraint...")

    // Create meta table if not exists
    await query(`
      CREATE TABLE IF NOT EXISTS meta (
        key VARCHAR(255) PRIMARY KEY,
        value TEXT
      );
    `)
    console.log("Meta table ensured.")

    // Add unique constraint.
    try {
      await query(`
            ALTER TABLE cities
            ADD CONSTRAINT cities_unique_entry UNIQUE (name, country_code, latitude, longitude);
        `)
      console.log("Successfully added unique constraint cities_unique_entry.")
    } catch (e: unknown) {
      const error = e as { code?: string; message?: string }
      if (error.code === "42710") {
        // duplicate_object (constraint already exists)
        console.log("Constraint cities_unique_entry already exists.")
      } else if (error.code === "23505") {
        // unique_violation (data violates constraint)
        console.warn(
          "Could not add unique constraint because duplicate data exists. Please clean up duplicates manually.",
        )
      } else {
        console.warn("Could not add unique constraint:", error.message)
      }
    }
  } catch (err) {
    console.error("Error in addCityUniqueConstraint:", err)
    throw err
  }
}

if (require.main === module) {
  migrate().catch((error) => {
    console.error("Migration failed:", error)
    process.exit(1)
  })
}
