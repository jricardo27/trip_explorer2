import { pool } from "../db"

const runMigration = async () => {
  const client = await pool.connect()
  try {
    console.log("Running migration: addUnifiedTripColumns")

    await client.query("BEGIN")

    // Add columns to day_locations
    await client.query(`
      ALTER TABLE day_locations 
      ADD COLUMN IF NOT EXISTS start_time TIME,
      ADD COLUMN IF NOT EXISTS end_time TIME;
    `)

    // Add columns to saved_features
    await client.query(`
      ALTER TABLE saved_features 
      ADD COLUMN IF NOT EXISTS visit_order INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS transport_mode TEXT,
      ADD COLUMN IF NOT EXISTS transport_details TEXT,
      ADD COLUMN IF NOT EXISTS transport_cost NUMERIC(10, 2),
      ADD COLUMN IF NOT EXISTS duration_minutes INTEGER,
      ADD COLUMN IF NOT EXISTS start_time TIME,
      ADD COLUMN IF NOT EXISTS end_time TIME;
    `)

    await client.query("COMMIT")
    console.log("Migration completed successfully")
  } catch (err) {
    await client.query("ROLLBACK")
    console.error("Migration failed:", err)
    process.exit(1)
  } finally {
    client.release()
  }
}

runMigration()
