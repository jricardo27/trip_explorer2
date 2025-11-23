import bcrypt from "bcryptjs"
import cors from "cors"
import express, { Request, Response } from "express"

import { query } from "./db"

const app = express()
app.use(cors())
app.use(express.json())

// Auth endpoints
app.post("/api/auth/signup", async (req: Request, res: Response) => {
  const { email, password } = req.body

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" })
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10)
    const result = await query(
      "INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email",
      [email, hashedPassword],
    )
    res.json(result.rows[0])
  } catch (err: unknown) {
    const error = err as { code?: string }
    if (error.code === "23505") { // Unique violation
      res.status(490).json({ error: "Email already exists" })
    } else {
      console.error(err)
      res.status(500).json({ error: "Internal server error" })
    }
  }
})

app.post("/api/auth/login", async (req: Request, res: Response) => {
  const { email, password } = req.body

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" })
  }

  try {
    const result = await query("SELECT * FROM users WHERE email = $1", [email])
    const user = result.rows[0]

    if (user && (await bcrypt.compare(password, user.password_hash))) {
      res.json({ id: user.id, email: user.email })
    } else {
      res.status(401).json({ error: "Invalid credentials" })
    }
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: "Internal server error" })
  }
})

const PORT = process.env.PORT || 3001

app.use(cors())
app.use(express.json())

// Get all markers for a specific path
// Get all markers for a specific path, optionally filtered by bounds
app.get("/api/markers", async (req: Request, res: Response) => {
  const { path, min_lon, min_lat, max_lon, max_lat } = req.query

  if (!path || typeof path !== "string") {
    return res.status(400).json({ error: "Path query parameter is required" })
  }

  try {
    // If bounds are provided, use spatial query on geo_features
    if (min_lon && min_lat && max_lon && max_lat) {
      // Get top-level properties from markers table
      const propsResult = await query("SELECT data->'properties' as properties FROM markers WHERE path = $1", [path])
      const collectionProperties = propsResult.rows[0]?.properties || {}

      console.log(`[API] Path: ${path}, Bounds: ${min_lon},${min_lat},${max_lon},${max_lat}`)
      console.log("[API] Found properties:", collectionProperties ? "Yes" : "No")

      const queryText = `
        SELECT properties, ST_AsGeoJSON(geom) as geometry 
        FROM geo_features 
        WHERE source_path = $1 
        AND geom && ST_MakeEnvelope($2, $3, $4, $5, 4326)
      `
      const values = [path, Number(min_lon), Number(min_lat), Number(max_lon), Number(max_lat)]

      const result = await query(queryText, values)
      console.log(`[API] Found ${result.rows.length} features`)

      // Reconstruct FeatureCollection
      const features = result.rows.map((row) => ({
        type: "Feature",
        properties: row.properties,
        geometry: JSON.parse(row.geometry),
      }))

      res.json({
        type: "FeatureCollection",
        properties: collectionProperties,
        features,
      })
    } else {
      // Fallback to full file fetch (legacy)
      const result = await query("SELECT data FROM markers WHERE path = $1", [path])
      if (result.rows.length > 0) {
        res.json(result.rows[0].data)
      } else {
        res.status(404).json({ error: "Markers not found" })
      }
    }
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: "Internal server error" })
  }
})

// Get saved features for a user
app.get("/api/features", async (req, res) => {
  const { user_id } = req.query
  if (!user_id || typeof user_id !== "string") {
    return res.status(400).json({ error: "User ID is required" })
  }

  try {
    const result = await query("SELECT * FROM saved_features WHERE user_id = $1", [user_id])

    // Group by list_name to match the frontend structure
    const features: Record<string, unknown[]> = {}
    result.rows.forEach((row) => {
      if (!features[row.list_name]) {
        features[row.list_name] = []
      }
      features[row.list_name].push(row.feature)
    })

    res.json(features)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: "Internal server error" })
  }
})

// Add a saved feature
app.post("/api/features", async (req, res) => {
  const { user_id, list_name, feature, trip_day_id } = req.body

  if (!user_id || !list_name || !feature) {
    return res.status(400).json({ error: "Missing required fields" })
  }

  try {
    await query(
      "INSERT INTO saved_features (user_id, list_name, feature, trip_day_id) VALUES ($1, $2, $3, $4)",
      [user_id, list_name, feature, trip_day_id || null],
    )
    res.status(201).json({ message: "Feature saved" })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: "Internal server error" })
  }
})

// Remove a saved feature
app.delete("/api/features", async (req, res) => {
  const { user_id, list_name, feature_id } = req.body

  if (!user_id || !list_name || !feature_id) {
    return res.status(400).json({ error: "Missing required fields" })
  }

  try {
    // We need to extract the ID from the JSONB feature column
    await query(
      `DELETE FROM saved_features 
       WHERE user_id = $1 
       AND list_name = $2 
       AND feature->'properties'->>'id' = $3`,
      [user_id, list_name, feature_id],
    )
    res.json({ message: "Feature removed" })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: "Internal server error" })
  }
})

// Update a saved feature
app.put("/api/features", async (req, res) => {
  const { user_id, feature } = req.body

  if (!user_id || !feature) {
    return res.status(400).json({ error: "Missing required fields" })
  }

  try {
    await query(
      `UPDATE saved_features 
             SET feature = $1 
             WHERE user_id = $2 
             AND feature->'properties'->>'id' = $3`,
      [feature, user_id, feature.properties.id],
    )
    res.json({ message: "Feature updated" })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: "Internal server error" })
  }
})

// --- Trips API ---

// Create a trip
app.post("/api/trips", async (req, res) => {
  const { user_id, name, start_date, end_date } = req.body

  if (!user_id || !name || !start_date || !end_date) {
    return res.status(400).json({ error: "Missing required fields" })
  }

  const client = await (await import("./db")).pool.connect()

  try {
    await client.query("BEGIN")

    // Create Trip
    const tripResult = await client.query(
      "INSERT INTO trips (user_id, name, start_date, end_date) VALUES ($1, $2, $3, $4) RETURNING *",
      [user_id, name, start_date, end_date],
    )
    const trip = tripResult.rows[0]

    // Generate Days
    const start = new Date(start_date)
    const end = new Date(end_date)
    const diffTime = Math.abs(end.getTime() - start.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1

    for (let i = 0; i < diffDays; i++) {
      const currentDay = new Date(start)
      currentDay.setDate(start.getDate() + i)
      await client.query(
        "INSERT INTO trip_days (trip_id, day_index, date) VALUES ($1, $2, $3)",
        [trip.id, i, currentDay.toISOString().split("T")[0]],
      )
    }

    await client.query("COMMIT")
    res.status(201).json(trip)
  } catch (err) {
    await client.query("ROLLBACK")
    console.error(err)
    res.status(500).json({ error: "Internal server error" })
  } finally {
    client.release()
  }
})

// Get user trips
app.get("/api/trips", async (req, res) => {
  const { user_id } = req.query
  if (!user_id || typeof user_id !== "string") {
    return res.status(400).json({ error: "User ID is required" })
  }

  try {
    const result = await query("SELECT * FROM trips WHERE user_id = $1 ORDER BY start_date", [user_id])
    res.json(result.rows)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: "Internal server error" })
  }
})

// Get trip details
app.get("/api/trips/:id", async (req, res) => {
  const { id } = req.params

  try {
    const tripResult = await query("SELECT * FROM trips WHERE id = $1", [id])
    if (tripResult.rows.length === 0) {
      return res.status(404).json({ error: "Trip not found" })
    }
    const trip = tripResult.rows[0]

    const daysResult = await query("SELECT * FROM trip_days WHERE trip_id = $1 ORDER BY day_index", [id])
    trip.days = daysResult.rows

    res.json(trip)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: "Internal server error" })
  }
})

// Delete trip
app.delete("/api/trips/:id", async (req, res) => {
  const { id } = req.params

  try {
    await query("DELETE FROM trips WHERE id = $1", [id])
    res.json({ message: "Trip deleted" })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: "Internal server error" })
  }
})

// Get features for a specific trip day
app.get("/api/trip-days/:id/features", async (req, res) => {
  const { id } = req.params

  try {
    const result = await query(
      "SELECT * FROM saved_features WHERE trip_day_id = $1 ORDER BY created_at",
      [id],
    )
    res.json(result.rows.map((row) => row.feature))
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: "Internal server error" })
  }
})

// Location search endpoint
app.get("/api/locations/search", async (req, res) => {
  const { q, limit = "10" } = req.query

  if (!q || typeof q !== "string") {
    return res.status(400).json({ error: "Query parameter 'q' is required" })
  }

  try {
    const result = await query(
      `SELECT id, name, country_name, country_code, latitude, longitude
       FROM cities
       WHERE name ILIKE $1 OR ascii_name ILIKE $1
       ORDER BY population DESC NULLS LAST
       LIMIT $2`,
      [`%${q}%`, parseInt(limit as string)],
    )
    res.json(result.rows)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: "Internal server error" })
  }
})

// Get locations for a trip day
app.get("/api/trip-days/:dayId/locations", async (req, res) => {
  const { dayId } = req.params

  try {
    const result = await query(
      "SELECT * FROM day_locations WHERE trip_day_id = $1 ORDER BY visit_order",
      [dayId],
    )
    res.json(result.rows)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: "Internal server error" })
  }
})

// Add location to a trip day
app.post("/api/trip-days/:dayId/locations", async (req, res) => {
  const { dayId } = req.params
  const { country, country_code, city, town, latitude, longitude, visit_order, notes } = req.body

  if (!country) {
    return res.status(400).json({ error: "Country is required" })
  }

  try {
    const locationCoords = latitude && longitude
      ? `ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)`
      : "NULL"

    const result = await query(
      `INSERT INTO day_locations 
       (trip_day_id, country, country_code, city, town, latitude, longitude, location_coords, visit_order, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, ${locationCoords}, $8, $9)
       RETURNING *`,
      [dayId, country, country_code, city, town, latitude, longitude, visit_order || 1, notes],
    )
    res.status(201).json(result.rows[0])
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: "Internal server error" })
  }
})

// Update a day location
app.put("/api/day-locations/:id", async (req, res) => {
  const { id } = req.params
  const { country, country_code, city, town, latitude, longitude, visit_order, notes } = req.body

  try {
    const locationCoords = latitude && longitude
      ? `ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)`
      : "NULL"

    const result = await query(
      `UPDATE day_locations
       SET country = $1, country_code = $2, city = $3, town = $4,
           latitude = $5, longitude = $6, location_coords = ${locationCoords},
           visit_order = $7, notes = $8
       WHERE id = $9
       RETURNING *`,
      [country, country_code, city, town, latitude, longitude, visit_order, notes, id],
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Location not found" })
    }

    res.json(result.rows[0])
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: "Internal server error" })
  }
})

// Delete a day location
app.delete("/api/day-locations/:id", async (req, res) => {
  const { id } = req.params

  try {
    await query("DELETE FROM day_locations WHERE id = $1", [id])
    res.json({ message: "Location deleted" })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: "Internal server error" })
  }
})

// Reorder day locations
app.put("/api/trip-days/:dayId/locations/reorder", async (req, res) => {
  const { dayId } = req.params
  const { locationIds } = req.body

  if (!Array.isArray(locationIds)) {
    return res.status(400).json({ error: "locationIds must be an array" })
  }

  try {
    // Update visit_order for each location
    for (let i = 0; i < locationIds.length; i++) {
      await query(
        "UPDATE day_locations SET visit_order = $1 WHERE id = $2 AND trip_day_id = $3",
        [i + 1, locationIds[i], dayId],
      )
    }
    res.json({ message: "Locations reordered" })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: "Internal server error" })
  }
})

export { app }

if (process.env.NODE_ENV !== "test") {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`)
  })
}
