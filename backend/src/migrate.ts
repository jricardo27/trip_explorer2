import fs from "fs"
import path from "path"

import { query } from "./db"

const MARKERS_DIR = path.join(__dirname, "../../public/markers")

async function migrate() {
  try {
    console.log("Starting migration...")

    // Recursively find all json files
    const files = getAllFiles(MARKERS_DIR)

    for (const file of files) {
      if (path.extname(file) === ".json") {
        const relativePath = path.relative(MARKERS_DIR, file)
        // Normalize path to match what frontend might request (remove extension, ensure forward slashes)
        const pathKey = "/markers/" + relativePath.replace(/\\/g, "/")

        console.log(`Processing ${pathKey}...`)

        const content = fs.readFileSync(file, "utf-8")
        const data = JSON.parse(content)

        await query("INSERT INTO markers (path, data) VALUES ($1, $2) ON CONFLICT (path) DO UPDATE SET data = $2", [
          pathKey,
          data,
        ])
      }
    }

    console.log("Migration complete!")
    process.exit(0)
  } catch (err) {
    console.error("Migration failed:", err)
    process.exit(1)
  }
}

function getAllFiles(dirPath: string, arrayOfFiles: string[] = []) {
  const files = fs.readdirSync(dirPath)

  files.forEach(function (file) {
    if (fs.statSync(dirPath + "/" + file).isDirectory()) {
      arrayOfFiles = getAllFiles(dirPath + "/" + file, arrayOfFiles)
    } else {
      arrayOfFiles.push(path.join(dirPath, "/", file))
    }
  })

  return arrayOfFiles
}

migrate()
