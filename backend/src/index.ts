import cors from "cors"
import express, { Request, Response } from "express"

import { query } from "./db"

const app = express()
const port = process.env.PORT || 3001

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
  const { user_id, list_name, feature } = req.body

  if (!user_id || !list_name || !feature) {
    return res.status(400).json({ error: "Missing required fields" })
  }

  try {
    await query(
      "INSERT INTO saved_features (user_id, list_name, feature) VALUES ($1, $2, $3)",
      [user_id, list_name, feature],
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

export { app }

if (process.env.NODE_ENV !== "test") {
  app.listen(port, () => {
    console.log(`Server running on port ${port}`)
  })
}
