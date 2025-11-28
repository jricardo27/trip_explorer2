import fs from "fs"
import path from "path"

import { query } from "../db"

interface MarkerFile {
  path: string
  data: unknown
}

export async function migrate() {
  console.log("Starting features data migration...")

  const markersDir = "/app/public/markers"
  console.log(`Looking for markers in: ${markersDir}`)

  if (!fs.existsSync(markersDir)) {
    console.warn(`Markers directory not found: ${markersDir}`)
    console.warn("Skipping features migration - directory does not exist")
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
      // Check if features for this source_path already exist
      const existing = await query("SELECT id FROM geo_features WHERE source_path = $1 LIMIT 1", [marker.path])

      if (existing.rows.length > 0) {
        console.log(`Skipping ${marker.path} (features already exist)`)
        skipped++
      } else {
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
          loaded++
        } else {
          console.log(`Skipping ${marker.path} (no features found)`)
          skipped++
        }
      }
    } catch (error) {
      console.error(`Error loading features for ${marker.path}:`, error)
    }
  }

  console.log("\nFeatures migration complete:")
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
