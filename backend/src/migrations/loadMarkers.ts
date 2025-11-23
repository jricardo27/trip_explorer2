import fs from "fs"
import path from "path"

import { query } from "../db"

interface MarkerFile {
  path: string
  data: unknown
}

async function loadMarkers() {
  console.log("Starting marker data migration...")

  const markersDir = "/app/public/markers"
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
        // Insert marker
        await query("INSERT INTO markers (path, data) VALUES ($1, $2)", [marker.path, marker.data])
        console.log(`Loaded ${marker.path}`)
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

loadMarkers().catch((error) => {
  console.error("Migration failed:", error)
})
