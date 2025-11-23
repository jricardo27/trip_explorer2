import * as fs from "fs"
import * as path from "path"
import * as readline from "readline"

import AdmZip from "adm-zip"
import axios from "axios"

import { pool } from "../db"

const COUNTRY_INFO_URL = "https://download.geonames.org/export/dump/countryInfo.txt"
const DATA_DIR = path.join(__dirname, "../../data")
const CITIES_FILE = path.join(DATA_DIR, "cities15000.txt")

interface CityRecord {
  name: string
  asciiName: string
  latitude: number
  longitude: number
  countryCode: string
  admin1Code: string
  population: number
  featureClass: string
  featureCode: string
}

// Parse country info file to get country names
async function loadCountryNames(): Promise<Map<string, string>> {
  const countryMap = new Map<string, string>()

  console.log("Downloading country info...")
  const response = await axios.get(COUNTRY_INFO_URL)
  const lines = response.data.split("\n")

  for (const line of lines) {
    if (line.startsWith("#") || !line.trim()) continue
    const parts = line.split("\t")
    if (parts.length >= 5) {
      const code = parts[0]
      const name = parts[4]
      countryMap.set(code, name)
    }
  }

  console.log(`Loaded ${countryMap.size} countries`)
  return countryMap
}

// Download and extract cities data
async function downloadCitiesData(): Promise<void> {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true })
  }

  if (fs.existsSync(CITIES_FILE)) {
    console.log("Cities file already exists, skipping download")
    return
  }

  console.log("Downloading cities data (this may take a while)...")

  const ZIP_FILE = path.join(DATA_DIR, "cities15000.zip")

  // Download the zip file
  const response = await axios.get(
    "https://download.geonames.org/export/dump/cities15000.zip",
    { responseType: "arraybuffer", timeout: 120000 },
  )

  fs.writeFileSync(ZIP_FILE, response.data)
  console.log("Download complete, extracting...")

  // Extract the zip file
  const zip = new AdmZip(ZIP_FILE)
  zip.extractAllTo(DATA_DIR, true)

  // Clean up zip file
  fs.unlinkSync(ZIP_FILE)
  console.log("Extraction complete")
}

// Parse a city record from GeoNames format
function parseCityLine(line: string): CityRecord | null {
  const parts = line.split("\t")
  if (parts.length < 18) return null

  return {
    name: parts[1],
    asciiName: parts[2],
    latitude: parseFloat(parts[4]),
    longitude: parseFloat(parts[5]),
    countryCode: parts[8],
    admin1Code: parts[10],
    population: parseInt(parts[14]) || 0,
    featureClass: parts[6],
    featureCode: parts[7],
  }
}

// Import cities into database
async function importCities(countryNames: Map<string, string>): Promise<void> {
  console.log("Importing cities into database...")

  const fileStream = fs.createReadStream(CITIES_FILE)
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  })

  let count = 0
  let batch: CityRecord[] = []
  const BATCH_SIZE = 1000

  for await (const line of rl) {
    const city = parseCityLine(line)
    if (!city) continue

    batch.push(city)

    if (batch.length >= BATCH_SIZE) {
      await insertBatch(batch, countryNames)
      count += batch.length
      console.log(`Imported ${count} cities...`)
      batch = []
    }
  }

  // Insert remaining cities
  if (batch.length > 0) {
    await insertBatch(batch, countryNames)
    count += batch.length
  }

  console.log(`Total cities imported: ${count}`)
}

// Insert a batch of cities
async function insertBatch(cities: CityRecord[], countryNames: Map<string, string>): Promise<void> {
  const values: unknown[] = []
  const placeholders: string[] = []

  cities.forEach((city, index) => {
    const offset = index * 11
    const placeholder =
            `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, ` +
            `$${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, ` +
            `$${offset + 9}, ST_SetSRID(ST_MakePoint($${offset + 10}, $${offset + 11}), 4326))`
    placeholders.push(placeholder)

    values.push(
      city.name,
      city.asciiName,
      city.countryCode,
      countryNames.get(city.countryCode) || city.countryCode,
      city.admin1Code,
      null, // admin1_name - would need additional lookup
      city.population,
      city.latitude,
      city.longitude,
      city.longitude, // for ST_MakePoint (lon, lat)
      city.latitude,
    )
  })

  const query = `
    INSERT INTO cities 
      (name, ascii_name, country_code, country_name, admin1_code, admin1_name, 
       population, latitude, longitude, location_coords)
    VALUES ${placeholders.join(", ")}
    ON CONFLICT DO NOTHING
  `

  await pool.query(query, values)
}

// Main execution
async function main() {
  try {
    console.log("Starting cities data import...")

    const countryNames = await loadCountryNames()
    await downloadCitiesData()
    await importCities(countryNames)

    console.log("Import complete!")
    process.exit(0)
  } catch (error) {
    console.error("Error importing cities:", error)
    process.exit(1)
  }
}

// Run if called directly
if (require.main === module) {
  main()
}

export { main as loadCities }
