import { query } from "../db"

export async function migrate() {
  try {
    console.log("Adding transport columns to day_locations table...")
    await query(`
      ALTER TABLE day_locations
      ADD COLUMN IF NOT EXISTS transport_mode VARCHAR(50),
      ADD COLUMN IF NOT EXISTS transport_details TEXT,
      ADD COLUMN IF NOT EXISTS transport_cost DECIMAL(10, 2),
      ADD COLUMN IF NOT EXISTS duration_minutes INTEGER;
    `)
    console.log("Successfully added transport columns.")
  } catch (err) {
    console.error("Error adding transport columns:", err)
    throw err
  }
}

if (require.main === module) {
  migrate().catch((error) => {
    console.error("Migration failed:", error)
    process.exit(1)
  })
}
