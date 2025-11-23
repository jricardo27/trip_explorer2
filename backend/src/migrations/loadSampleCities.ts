import { pool } from "../db"

// Sample cities data for testing
const sampleCities = [
  { name: "Tokyo", country_code: "JP", country_name: "Japan", lat: 35.6762, lon: 139.6503, population: 13960000 },
  { name: "Singapore", country_code: "SG", country_name: "Singapore", lat: 1.3521, lon: 103.8198, population: 5850000 },
  { name: "Bangkok", country_code: "TH", country_name: "Thailand", lat: 13.7563, lon: 100.5018, population: 10900000 },
  { name: "Seoul", country_code: "KR", country_name: "South Korea", lat: 37.5665, lon: 126.9780, population: 9776000 },
  { name: "Hong Kong", country_code: "HK", country_name: "Hong Kong", lat: 22.3193, lon: 114.1694, population: 7482000 },
  { name: "Kuala Lumpur", country_code: "MY", country_name: "Malaysia", lat: 3.1390, lon: 101.6869, population: 1768000 },
  { name: "Manila", country_code: "PH", country_name: "Philippines", lat: 14.5995, lon: 120.9842, population: 13923000 },
  { name: "Jakarta", country_code: "ID", country_name: "Indonesia", lat: -6.2088, lon: 106.8456, population: 10770000 },
  { name: "Ho Chi Minh City", country_code: "VN", country_name: "Vietnam", lat: 10.8231, lon: 106.6297, population: 8993000 },
  { name: "Hanoi", country_code: "VN", country_name: "Vietnam", lat: 21.0285, lon: 105.8542, population: 8053000 },
  { name: "Osaka", country_code: "JP", country_name: "Japan", lat: 34.6937, lon: 135.5023, population: 2725000 },
  { name: "Kyoto", country_code: "JP", country_name: "Japan", lat: 35.0116, lon: 135.7681, population: 1475000 },
  { name: "Melbourne", country_code: "AU", country_name: "Australia", lat: -37.8136, lon: 144.9631, population: 5078000 },
  { name: "Sydney", country_code: "AU", country_name: "Australia", lat: -33.8688, lon: 151.2093, population: 5312000 },
  { name: "Brisbane", country_code: "AU", country_name: "Australia", lat: -27.4698, lon: 153.0251, population: 2514000 },
  { name: "Perth", country_code: "AU", country_name: "Australia", lat: -31.9505, lon: 115.8605, population: 2085000 },
  { name: "Auckland", country_code: "NZ", country_name: "New Zealand", lat: -36.8485, lon: 174.7633, population: 1657000 },
  { name: "Wellington", country_code: "NZ", country_name: "New Zealand", lat: -41.2865, lon: 174.7762, population: 418500 },
  { name: "Christchurch", country_code: "NZ", country_name: "New Zealand", lat: -43.5321, lon: 172.6362, population: 389700 },
  { name: "London", country_code: "GB", country_name: "United Kingdom", lat: 51.5074, lon: -0.1278, population: 9002000 },
  { name: "Paris", country_code: "FR", country_name: "France", lat: 48.8566, lon: 2.3522, population: 2161000 },
  { name: "New York", country_code: "US", country_name: "United States", lat: 40.7128, lon: -74.0060, population: 8336000 },
  { name: "Los Angeles", country_code: "US", country_name: "United States", lat: 34.0522, lon: -118.2437, population: 3979000 },
  { name: "San Francisco", country_code: "US", country_name: "United States", lat: 37.7749, lon: -122.4194, population: 873965 },
  { name: "Chicago", country_code: "US", country_name: "United States", lat: 41.8781, lon: -87.6298, population: 2716000 },
  { name: "Toronto", country_code: "CA", country_name: "Canada", lat: 43.6532, lon: -79.3832, population: 2930000 },
  { name: "Vancouver", country_code: "CA", country_name: "Canada", lat: 49.2827, lon: -123.1207, population: 675000 },
  { name: "Dubai", country_code: "AE", country_name: "United Arab Emirates", lat: 25.2048, lon: 55.2708, population: 3331000 },
  { name: "Rome", country_code: "IT", country_name: "Italy", lat: 41.9028, lon: 12.4964, population: 2873000 },
  { name: "Barcelona", country_code: "ES", country_name: "Spain", lat: 41.3851, lon: 2.1734, population: 1620000 },
]

async function loadSampleCities() {
  console.log("Loading sample cities data...")

  try {
    for (const city of sampleCities) {
      await pool.query(
        `INSERT INTO cities (name, ascii_name, country_code, country_name, population, latitude, longitude, location_coords)
         VALUES ($1, $2, $3, $4, $5, $6, $7, ST_SetSRID(ST_MakePoint($8, $9), 4326))
         ON CONFLICT DO NOTHING`,
        [city.name, city.name, city.country_code, city.country_name, city.population, city.lat, city.lon, city.lon, city.lat],
      )
    }

    console.log(`Successfully loaded ${sampleCities.length} sample cities`)
    process.exit(0)
  } catch (error) {
    console.error("Error loading sample cities:", error)
    process.exit(1)
  }
}

// Run if called directly
if (require.main === module) {
  loadSampleCities()
}

export { loadSampleCities }
