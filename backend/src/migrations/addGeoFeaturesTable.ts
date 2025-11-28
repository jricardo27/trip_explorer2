import { query } from "../db"

export async function migrate() {
  try {
    console.log("Creating geo_features table...")

    await query(`
      CREATE TABLE IF NOT EXISTS geo_features (
        id SERIAL PRIMARY KEY,
        source_path TEXT NOT NULL,
        properties JSONB NOT NULL,
        geom GEOMETRY (Geometry, 4326)
      );
    `)

    await query(`
      CREATE INDEX IF NOT EXISTS geo_features_geom_idx ON geo_features USING GIST (geom);
    `)

    await query(`
      CREATE INDEX IF NOT EXISTS idx_geo_features_source_path ON geo_features (source_path);
    `)

    console.log("Successfully created geo_features table.")
  } catch (err) {
    console.error("Error creating geo_features table:", err)
    throw err
  }
}

if (require.main === module) {
  migrate().catch((error) => {
    console.error("Migration failed:", error)
    process.exit(1)
  })
}
