import { Router } from "express"

import { query } from "../db"

const router = Router()

router.get("/travel-stats", async (req, res) => {
  const { user_id, year } = req.query

  if (!user_id || typeof user_id !== "string") {
    return res.status(400).json({ error: "User ID is required" })
  }

  try {
    let dateFilter = ""
    const params: (string | number)[] = [user_id]

    if (year === "future") {
      dateFilter = "AND t.start_date > NOW()"
    } else if (year && year !== "all") {
      dateFilter = "AND EXTRACT(YEAR FROM t.start_date) = $2"
      params.push(String(year))
    } else {
      // Default "all" -> Past trips (trips that have ended)
      dateFilter = "AND t.end_date <= NOW()"
    }

    // Get trips count and days
    const tripsQuery = `
      SELECT 
        COUNT(*) as total_trips,
        COALESCE(SUM(t.end_date - t.start_date + 1), 0) as total_days
      FROM trips t
      WHERE t.user_id = $1 ${dateFilter}
    `
    const tripsResult = await query(tripsQuery, params)
    const { total_trips, total_days } = tripsResult.rows[0]

    // Get unique countries
    const countriesQuery = `
      SELECT DISTINCT dl.country, dl.country_code
      FROM day_locations dl
      JOIN trip_days td ON dl.trip_day_id = td.id
      JOIN trips t ON td.trip_id = t.id
      WHERE t.user_id = $1 ${dateFilter}
      AND dl.country IS NOT NULL
      ORDER BY dl.country
    `
    const countriesResult = await query(countriesQuery, params)

    // Get unique cities
    const citiesQuery = `
      SELECT DISTINCT dl.city, dl.country
      FROM day_locations dl
      JOIN trip_days td ON dl.trip_day_id = td.id
      JOIN trips t ON td.trip_id = t.id
      WHERE t.user_id = $1 ${dateFilter}
      AND dl.city IS NOT NULL
      ORDER BY dl.city
    `
    const citiesResult = await query(citiesQuery, params)

    // Get detailed places (locations + features)
    // Use DISTINCT ON to avoid duplicates (e.g. visiting the same city multiple times)
    const locationsQuery = `
      SELECT DISTINCT ON (COALESCE(dl.city, dl.town), dl.country)
        dl.city, 
        dl.town, 
        dl.country,
        dl.latitude,
        dl.longitude,
        'location' as type
      FROM day_locations dl
      JOIN trip_days td ON dl.trip_day_id = td.id
      JOIN trips t ON td.trip_id = t.id
      WHERE t.user_id = $1 ${dateFilter}
      ORDER BY COALESCE(dl.city, dl.town), dl.country
    `
    const featuresQuery = `
      SELECT DISTINCT ON (sf.feature->'properties'->>'name')
        sf.feature,
        'feature' as type
      FROM saved_features sf
      JOIN trip_days td ON sf.trip_day_id = td.id
      JOIN trips t ON td.trip_id = t.id
      WHERE t.user_id = $1 ${dateFilter}
      ORDER BY sf.feature->'properties'->>'name'
    `

    const locationsResult = await query(locationsQuery, params)
    const featuresResult = await query(featuresQuery, params)

    const places = [
      ...locationsResult.rows.map((r: unknown) => {
        const row = r as { city?: string; town?: string; country: string; latitude: number; longitude: number }
        return {
          name: row.city || row.town || "Unknown Location",
          country: row.country,
          type: "location",
          lat: row.latitude,
          lng: row.longitude,
        }
      }),
      ...featuresResult.rows.map((r: unknown) => {
        const row = r as {
          feature: { properties?: { name?: string; title?: string }; geometry?: { coordinates: number[] } }
        }
        return {
          name: row.feature.properties?.name || row.feature.properties?.title || "Unknown Feature",
          country: "Unknown",
          type: "feature",
          lat: row.feature.geometry?.coordinates[1],
          lng: row.feature.geometry?.coordinates[0],
        }
      }),
    ]

    const total_places = places.length

    // Get available years for filter
    const yearsQuery = `
      SELECT DISTINCT EXTRACT(YEAR FROM start_date) as year
      FROM trips
      WHERE user_id = $1
      ORDER BY year DESC
    `
    // Get detailed trips list
    const tripDetailsQuery = `
      SELECT 
        t.id,
        t.name,
        t.start_date,
        t.end_date,
        (t.end_date - t.start_date + 1) as duration_days,
        ARRAY_AGG(DISTINCT dl.country) FILTER (WHERE dl.country IS NOT NULL) as countries,
        ARRAY_AGG(DISTINCT dl.city) FILTER (WHERE dl.city IS NOT NULL) as cities
      FROM trips t
      LEFT JOIN trip_days td ON t.id = td.trip_id
      LEFT JOIN day_locations dl ON td.id = dl.trip_day_id
      WHERE t.user_id = $1 ${dateFilter}
      GROUP BY t.id
      ORDER BY t.start_date DESC
    `

    // Only fetch years if we're not filtering by year (or just always fetch them for the UI)
    // We'll fetch them in a separate call or just return them here for convenience
    const yearsResult = await query(yearsQuery, [user_id])
    const available_years = yearsResult.rows.map((r) => r.year)

    const tripDetailsResult = await query(tripDetailsQuery, params)
    const trips = tripDetailsResult.rows

    res.json({
      total_trips: parseInt(total_trips),
      total_days: parseInt(total_days),
      total_places,
      countries_count: countriesResult.rows.length,
      cities_count: citiesResult.rows.length,
      countries: countriesResult.rows,
      cities: citiesResult.rows,
      places,
      trips,
      available_years,
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: "Internal server error" })
  }
})

export default router
