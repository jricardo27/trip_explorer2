import fs from "fs"
import path from "path"

import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

// Helper to calculate centroid from GeoJSON geometry
function calculateCentroid(geometry: any): [number, number] {
  if (geometry.type === "Point") {
    return geometry.coordinates
  }

  if (geometry.type === "Polygon") {
    const coords = geometry.coordinates[0]
    const sum = coords.reduce(
      (acc: [number, number], coord: [number, number]) => [acc[0] + coord[0], acc[1] + coord[1]],
      [0, 0],
    )
    return [sum[0] / coords.length, sum[1] / coords.length]
  }

  if (geometry.type === "MultiPolygon") {
    // Use the first polygon's centroid
    const coords = geometry.coordinates[0][0]
    const sum = coords.reduce(
      (acc: [number, number], coord: [number, number]) => [acc[0] + coord[0], acc[1] + coord[1]],
      [0, 0],
    )
    return [sum[0] / coords.length, sum[1] / coords.length]
  }

  return [0, 0]
}

async function seedCountries() {
  console.log("🌍 Seeding countries...")

  const geojsonPath = path.join(__dirname, "../../data/geodata/countries.geojson")

  if (!fs.existsSync(geojsonPath)) {
    console.error("❌ countries.geojson not found at:", geojsonPath)
    console.log(
      "Run: curl -o backend/data/geodata/countries.geojson " +
        "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_admin_0_countries.geojson",
    )
    return
  }

  const geojson = JSON.parse(fs.readFileSync(geojsonPath, "utf-8"))

  let count = 0
  for (const feature of geojson.features) {
    const { NAME, ISO_A2, ISO_A3, CONTINENT, REGION } = feature.properties

    // Skip features without ISO codes
    if (!ISO_A2 || ISO_A2 === "-99") continue

    const centroid = calculateCentroid(feature.geometry)

    try {
      await prisma.country.upsert({
        where: { code: ISO_A2 },
        create: {
          name: NAME,
          code: ISO_A2,
          code3: ISO_A3 && ISO_A3 !== "-99" ? ISO_A3 : null,
          continent: CONTINENT,
          region: REGION,
          boundary: feature.geometry,
          centroid: { lat: centroid[1], lng: centroid[0] },
        },
        update: {
          name: NAME,
          boundary: feature.geometry,
          centroid: { lat: centroid[1], lng: centroid[0] },
          continent: CONTINENT,
          region: REGION,
        },
      })
      count++
      if (count % 10 === 0) {
        console.log(`  ✓ Processed ${count} countries...`)
      }
    } catch (error) {
      console.error(`  ✗ Error processing ${NAME}:`, error)
    }
  }

  console.log(`✅ Seeded ${count} countries successfully!`)
}

async function main() {
  try {
    await seedCountries()
  } catch (error) {
    console.error("Error seeding data:", error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
