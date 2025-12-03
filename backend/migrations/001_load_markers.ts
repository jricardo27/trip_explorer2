import fs from "fs"
import path from "path"

import { query } from "../src/db"

interface MarkerFile {
  path: string
  data: unknown
}

export async function migrate() {
  console.log("Starting marker data migration...")

  // Determine markers directory based on execution context
  // When running locally: ../../public/markers
  // When running in Docker: /app/public/markers
  let markersDir = path.join(__dirname, "../../../public/markers")

  if (!fs.existsSync(markersDir)) {
    // Fallback for Docker or different structure
    markersDir = "/app/public/markers"
  }

  console.log(`Looking for markers in: ${markersDir}`)

  if (!fs.existsSync(markersDir)) {
    console.warn(`Markers directory not found: ${markersDir}`)
    console.warn("Skipping marker migration - directory does not exist")
    return
  }

  const markerFiles: MarkerFile[] = []

  // Recursively find all .json files
  function findJsonFiles(dir: string, basePath = "/markers") {
    const files = fs.readdirSync(dir)

    files.forEach((file) => {
      const fullPath = path.join(dir, file)
      const stat = fs.statSync(fullPath)

      if (stat.isDirectory()) {
        findJsonFiles(fullPath, `${basePath}/${file}`)
      } else if (file.endsWith(".json")) {
        const relativePath = `${basePath}/${file}`
        const content = fs.readFileSync(fullPath, "utf-8")
        const data = JSON.parse(content)

        markerFiles.push({
          path: relativePath,
          data,
        })
      }
    })
  }

  findJsonFiles(markersDir)

  console.log(`Found ${markerFiles.length} marker files`)

  let loaded = 0
  let skipped = 0

  for (const marker of markerFiles) {
    try {
      // Check if marker already exists
      const existing = await query("SELECT id FROM markers WHERE path = $1", [marker.path])

      if (existing.rows.length > 0) {
        console.log(`Skipping ${marker.path} (already exists)`)
        skipped++
      } else {
        // Insert into markers table (legacy support)
        await query("INSERT INTO markers (path, data) VALUES ($1, $2)", [marker.path, marker.data])

        // Insert individual features into geo_features table
        const featureCollection = marker.data as { features: { geometry: object; properties: object }[] }
        if (featureCollection.features && Array.isArray(featureCollection.features)) {
          let featureCount = 0
          for (const feature of featureCollection.features) {
            if (feature.geometry && feature.properties) {
              await query(
                `INSERT INTO geo_features (source_path, properties, geom) 
                 VALUES ($1, $2, ST_SetSRID(ST_GeomFromGeoJSON($3), 4326))`,
                [marker.path, feature.properties, JSON.stringify(feature.geometry)],
              )
              featureCount++
            }
          }
          console.log(`Loaded ${marker.path} (${featureCount} features)`)
        } else {
          console.log(`Loaded ${marker.path} (no features found)`)
        }

        loaded++
      }
    } catch (error) {
      console.error(`Error loading ${marker.path}:`, error)
    }
  }

  console.log("\nMigration complete:")
  console.log(`  - Loaded: ${loaded}`)
  console.log(`  - Skipped: ${skipped}`)
  console.log(`  - Total: ${markerFiles.length}`)
}

if (require.main === module) {
  migrate().catch((error) => {
    console.error("Migration failed:", error)
    process.exit(1)
  })
}
