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
    const result = await query("INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email", [
      email,
      hashedPassword,
    ])
    res.json(result.rows[0])
  } catch (err: unknown) {
    const error = err as { code?: string }
    if (error.code === "23505") {
      // Unique violation
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
    let nextOrder = 1
    if (trip_day_id) {
      const maxOrderResult = await query(
        `SELECT MAX(vo) as max_order FROM (
          SELECT visit_order as vo FROM day_locations WHERE trip_day_id = $1
          UNION ALL
          SELECT visit_order as vo FROM saved_features WHERE trip_day_id = $1
        ) as combined_orders`,
        [trip_day_id],
      )
      nextOrder = (maxOrderResult.rows[0]?.max_order || 0) + 1
    }

    await query(
      "INSERT INTO saved_features (user_id, list_name, feature, trip_day_id, visit_order) VALUES ($1, $2, $3, $4, $5)",
      [user_id, list_name, feature, trip_day_id || null, trip_day_id ? nextOrder : null],
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
      await client.query("INSERT INTO trip_days (trip_id, day_index, date) VALUES ($1, $2, $3)", [
        trip.id,
        i,
        currentDay.toISOString().split("T")[0],
      ])
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

// Get trip details with all data
app.get("/api/trips/:id", async (req, res) => {
  const { id } = req.params

  try {
    const tripResult = await query("SELECT * FROM trips WHERE id = $1", [id])
    if (tripResult.rows.length === 0) {
      return res.status(404).json({ error: "Trip not found" })
    }
    const trip = tripResult.rows[0]

    // Fetch days
    const daysResult = await query("SELECT id, day_index, date FROM trip_days WHERE trip_id = $1 ORDER BY day_index", [
      id,
    ])
    trip.days = daysResult.rows

    if (trip.days.length > 0) {
      const dayIds = trip.days.map((d: { id: string }) => d.id)

      // Fetch all locations for this trip
      const locationsResult = await query(
        "SELECT * FROM day_locations WHERE trip_day_id = ANY($1) ORDER BY visit_order",
        [dayIds],
      )

      // Fetch all features for this trip
      // We need to join with saved_features table columns
      const featuresResult = await query(
        "SELECT * FROM saved_features WHERE trip_day_id = ANY($1) ORDER BY visit_order, created_at",
        [dayIds],
      )

      // Attach to response (optional, or let frontend handle mapping)
      // We'll send them as separate fields to keep the trip object clean,
      // or we can nest them. Nesting is usually easier for the client if they expect a tree.
      // But TripContext expects normalized state (record by dayId).
      // So returning flat lists of locations and features might be easier to process into the Record<string, ...> state.

      trip.allLocations = locationsResult.rows
      trip.allFeatures = featuresResult.rows.map((row) => ({
        ...row.feature,
        saved_id: row.id, // Primary key of saved_features table
        trip_day_id: row.trip_day_id,
        visit_order: row.visit_order,
        transport_mode: row.transport_mode,
        transport_details: row.transport_details,
        transport_cost: row.transport_cost,
        duration_minutes: row.duration_minutes,
        start_time: row.start_time,
        end_time: row.end_time,
      }))
    } else {
      trip.allLocations = []
      trip.allFeatures = []
    }

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
    const result = await query("SELECT * FROM saved_features WHERE trip_day_id = $1 ORDER BY created_at", [id])
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
    const result = await query("SELECT * FROM day_locations WHERE trip_day_id = $1 ORDER BY visit_order", [dayId])
    res.json(result.rows)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: "Internal server error" })
  }
})

// Add location to a trip day
app.post("/api/trip-days/:dayId/locations", async (req, res) => {
  const { dayId } = req.params
  const {
    country,
    country_code,
    city,
    town,
    latitude,
    longitude,
    visit_order,
    notes,
    transport_mode,
    transport_details,
    transport_cost,
    duration_minutes,
  } = req.body

  if (!country) {
    return res.status(400).json({ error: "Country is required" })
  }

  try {
    // Calculate next visit_order
    const maxOrderResult = await query(
      `SELECT MAX(vo) as max_order FROM (
        SELECT visit_order as vo FROM day_locations WHERE trip_day_id = $1
        UNION ALL
        SELECT visit_order as vo FROM saved_features WHERE trip_day_id = $1
      ) as combined_orders`,
      [dayId],
    )
    const nextOrder = (maxOrderResult.rows[0]?.max_order || 0) + 1

    const locationCoords = latitude && longitude ? `ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)` : "NULL"

    const result = await query(
      `INSERT INTO day_locations 
       (
        trip_day_id,
        country,
        country_code,
        city,
        town,
        latitude,
        longitude,
        location_coords,
        visit_order,
        notes,
        transport_mode,
        transport_details,
        transport_cost,
        duration_minutes,
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, ${locationCoords}, $8, $9, $10, $11, $12, $13)
       RETURNING *`,
      [
        dayId,
        country,
        country_code,
        city,
        town,
        latitude,
        longitude,
        visit_order || nextOrder,
        notes,
        transport_mode,
        transport_details,
        transport_cost,
        duration_minutes,
      ],
    )
    res.status(201).json(result.rows[0])
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: "Internal server error" })
  }
})

// Reorder day items (locations and features)
app.put("/api/trip-days/:dayId/reorder", async (req, res) => {
  const { dayId } = req.params
  const { items } = req.body // Array of { id, type: 'location' | 'feature', order }

  if (!Array.isArray(items)) {
    return res.status(400).json({ error: "items must be an array" })
  }

  const client = await (await import("./db")).pool.connect()

  try {
    await client.query("BEGIN")

    for (const item of items) {
      if (item.type === "location") {
        await client.query("UPDATE day_locations SET visit_order = $1 WHERE id = $2 AND trip_day_id = $3", [
          item.order,
          item.id,
          dayId,
        ])
      } else if (item.type === "feature") {
        // For features, we need to update the saved_features table
        // We assume features in a trip day have trip_day_id set
        // We need to update the 'visit_order' column which we just added
        await client.query("UPDATE saved_features SET visit_order = $1 WHERE id = $2 AND trip_day_id = $3", [
          item.order,
          item.id,
          dayId,
        ])
      }
    }

    await client.query("COMMIT")
    res.json({ message: "Items reordered" })
  } catch (err) {
    await client.query("ROLLBACK")
    console.error(err)
    res.status(500).json({ error: "Internal server error" })
  } finally {
    client.release()
  }
})

// Update a saved feature (extended for transport details)
app.put("/api/features", async (req, res) => {
  const {
    user_id,
    feature,
    transport_mode,
    transport_details,
    transport_cost,
    duration_minutes,
    start_time,
    end_time,
  } = req.body

  if (!user_id || !feature) {
    return res.status(400).json({ error: "Missing required fields" })
  }

  try {
    await query(
      `UPDATE saved_features 
             SET feature = $1,
                 transport_mode = $4,
                 transport_details = $5,
                 transport_cost = $6,
                 duration_minutes = $7,
                 start_time = $8,
                 end_time = $9
             WHERE user_id = $2 
             AND feature->'properties'->>'id' = $3`,
      [
        feature,
        user_id,
        feature.properties.id,
        transport_mode,
        transport_details,
        transport_cost,
        duration_minutes,
        start_time,
        end_time,
      ],
    )
    res.json({ message: "Feature updated" })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: "Internal server error" })
  }
})

// Update a day location (extended for time)
app.put("/api/day-locations/:id", async (req, res) => {
  const { id } = req.params
  const {
    country,
    country_code,
    city,
    town,
    latitude,
    longitude,
    visit_order,
    notes,
    transport_mode,
    transport_details,
    transport_cost,
    duration_minutes,
    start_time,
    end_time,
  } = req.body

  try {
    const locationCoords = latitude && longitude ? `ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)` : "NULL"

    const result = await query(
      `UPDATE day_locations
       SET country = $1, country_code = $2, city = $3, town = $4,
           latitude = $5, longitude = $6, location_coords = ${locationCoords},
           visit_order = $7, notes = $8,
           transport_mode = $9, transport_details = $10, transport_cost = $11, duration_minutes = $12,
           start_time = $13, end_time = $14
       WHERE id = $15
       RETURNING *`,
      [
        country,
        country_code,
        city,
        town,
        latitude,
        longitude,
        visit_order,
        notes,
        transport_mode,
        transport_details,
        transport_cost,
        duration_minutes,
        start_time,
        end_time,
        id,
      ],
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

// Delete a location from a trip day
app.delete("/api/day-locations/:id", async (req, res) => {
  const { id } = req.params

  try {
    const result = await query("DELETE FROM day_locations WHERE id = $1 RETURNING *", [id])

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Location not found" })
    }

    res.json({ message: "Location deleted", deleted: result.rows[0] })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: "Internal server error" })
  }
})

// Delete a feature from a trip day
app.delete("/api/trip-days/:dayId/features/:savedId", async (req, res) => {
  const { dayId, savedId } = req.params

  try {
    const result = await query("DELETE FROM saved_features WHERE id = $1 AND trip_day_id = $2 RETURNING *", [
      savedId,
      dayId,
    ])

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Feature not found in this trip day" })
    }

    res.json({ message: "Feature deleted from trip day", deleted: result.rows[0] })
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
