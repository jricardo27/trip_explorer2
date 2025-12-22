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

// Helper to find country by coordinates (reverse lookup)
async function findCountryByCoordinates(lat: number, lng: number): Promise<any> {
  // This is a simplified approach - in production you'd use PostGIS ST_Contains
  // For now, we'll try to match by proximity to country centroids
  const countries = await prisma.country.findMany({
    select: { id: true, code: true, centroid: true, name: true },
  })

  let closestCountry = null
  let minDistance = Infinity

  for (const country of countries) {
    if (country.centroid && typeof country.centroid === "object") {
      const centroid = country.centroid as any
      const distance = Math.sqrt(Math.pow(centroid.lat - lat, 2) + Math.pow(centroid.lng - lng, 2))
      if (distance < minDistance) {
        minDistance = distance
        closestCountry = country
      }
    }
  }

  return closestCountry
}

async function seedCities() {
  console.log("🏙️  Seeding cities from GeoJSON...")

  const geojsonPath = path.join(__dirname, "../../data/geodata/cities.geojson")

  if (!fs.existsSync(geojsonPath)) {
    console.error("❌ cities.geojson not found at:", geojsonPath)
    console.log("Please download a cities GeoJSON file to backend/data/geodata/cities.geojson")
    return
  }

  const geojson = JSON.parse(fs.readFileSync(geojsonPath, "utf-8"))

  let count = 0
  let skipped = 0
  const batchSize = 100

  console.log(`Found ${geojson.features.length} cities in GeoJSON`)
  console.log("Processing in batches...")

  for (let i = 0; i < geojson.features.length; i++) {
    const feature = geojson.features[i]
    const cityName = feature.properties.NAME || feature.properties.name

    if (!cityName) {
      skipped++
      continue
    }

    try {
      const centroid = calculateCentroid(feature.geometry)
      const [lng, lat] = centroid

      // Find the country this city belongs to
      const country = await findCountryByCoordinates(lat, lng)

      if (!country) {
        skipped++
        continue
      }

      await prisma.city.upsert({
        where: {
          name_countryCode: {
            name: cityName,
            countryCode: country.code,
          },
        },
        create: {
          name: cityName,
          countryId: country.id,
          countryCode: country.code,
          latitude: lat,
          longitude: lng,
          boundary: feature.geometry,
        },
        update: {
          latitude: lat,
          longitude: lng,
          boundary: feature.geometry,
        },
      })

      count++

      if (count % batchSize === 0) {
        console.log(`  ✓ Processed ${count} cities... (skipped ${skipped})`)
      }
    } catch (error: any) {
      if (error.code !== "P2002") {
        // Ignore duplicate errors
        console.error(`  ✗ Error processing ${cityName}:`, error.message)
      }
      skipped++
    }
  }

  console.log(`✅ Seeded ${count} cities successfully! (Skipped ${skipped})`)
}

async function main() {
  try {
    await seedCities()
  } catch (error) {
    console.error("Error seeding cities:", error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
