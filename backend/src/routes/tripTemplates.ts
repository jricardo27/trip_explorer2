import { Request, Response, Router } from "express"

import { query } from "../db"

const router = Router()

// Get all templates for a user
router.get("/", async (req: Request, res: Response) => {
  const { user_id } = req.query

  if (!user_id || typeof user_id !== "string") {
    return res.status(400).json({ error: "user_id query parameter is required" })
  }

  try {
    const result = await query(
      "SELECT id, name, description, is_public, created_at FROM trip_templates WHERE user_id = $1 ORDER BY created_at DESC",
      [user_id],
    )
    res.json(result.rows)
  } catch (err) {
    console.error("Error fetching templates:", err)
    res.status(500).json({ error: "Internal server error" })
  }
})

// Get a specific template
router.get("/:id", async (req: Request, res: Response) => {
  const { id } = req.params

  try {
    const result = await query("SELECT * FROM trip_templates WHERE id = $1", [id])

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Template not found" })
    }

    res.json(result.rows[0])
  } catch (err) {
    console.error("Error fetching template:", err)
    res.status(500).json({ error: "Internal server error" })
  }
})

// Create a template from a trip
router.post("/", async (req: Request, res: Response) => {
  const { user_id, trip_id, name, description, is_public } = req.body

  if (!user_id || !trip_id || !name) {
    return res.status(400).json({ error: "user_id, trip_id, and name are required" })
  }

  try {
    // Fetch the trip data
    const tripResult = await query("SELECT * FROM trips WHERE id = $1 AND user_id = $2", [trip_id, user_id])

    if (tripResult.rows.length === 0) {
      return res.status(404).json({ error: "Trip not found" })
    }

    const trip = tripResult.rows[0]

    // Fetch trip days
    const daysResult = await query("SELECT * FROM trip_days WHERE trip_id = $1 ORDER BY day_index", [trip_id])

    // Fetch locations and features for all days
    const dayIds = daysResult.rows.map((day) => day.id)

    let locations = []
    let features = []

    if (dayIds.length > 0) {
      const locationsResult = await query(
        "SELECT * FROM day_locations WHERE trip_day_id = ANY($1) ORDER BY visit_order",
        [dayIds],
      )
      const featuresResult = await query(
        "SELECT * FROM saved_features WHERE trip_day_id = ANY($1) ORDER BY visit_order",
        [dayIds],
      )

      locations = locationsResult.rows
      features = featuresResult.rows
    }

    // Build template data (without dates and IDs)
    const templateData = {
      name: trip.name,
      duration_days: daysResult.rows.length,
      days: daysResult.rows.map((day, index) => ({
        day_index: index,
        locations: locations
          .filter((loc) => loc.trip_day_id === day.id)
          .map((loc) => ({
            country: loc.country,
            country_code: loc.country_code,
            city: loc.city,
            town: loc.town,
            latitude: loc.latitude,
            longitude: loc.longitude,
            visit_order: loc.visit_order,
            notes: loc.notes,
            transport_mode: loc.transport_mode,
            transport_details: loc.transport_details,
            transport_cost: loc.transport_cost,
            duration_minutes: loc.duration_minutes,
            start_time: loc.start_time,
            end_time: loc.end_time,
            animation_config: loc.animation_config,
          })),
        features: features
          .filter((feat) => feat.trip_day_id === day.id)
          .map((feat) => ({
            list_name: feat.list_name,
            feature: feat.feature,
            visit_order: feat.visit_order,
            transport_mode: feat.transport_mode,
            transport_details: feat.transport_details,
            transport_cost: feat.transport_cost,
            duration_minutes: feat.duration_minutes,
            start_time: feat.start_time,
            end_time: feat.end_time,
            animation_config: feat.animation_config,
          })),
      })),
      animation_config: trip.animation_config,
    }

    // Create the template
    const result = await query(
      "INSERT INTO trip_templates (user_id, name, description, is_public, template_data) VALUES ($1, $2, $3, $4, $5) RETURNING *",
      [user_id, name, description || null, is_public || false, JSON.stringify(templateData)],
    )

    res.status(201).json(result.rows[0])
  } catch (err) {
    console.error("Error creating template:", err)
    res.status(500).json({ error: "Internal server error" })
  }
})

// Delete a template
router.delete("/:id", async (req: Request, res: Response) => {
  const { id } = req.params
  const { user_id } = req.query

  if (!user_id || typeof user_id !== "string") {
    return res.status(400).json({ error: "user_id query parameter is required" })
  }

  try {
    const result = await query("DELETE FROM trip_templates WHERE id = $1 AND user_id = $2 RETURNING *", [id, user_id])

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Template not found" })
    }

    res.json({ message: "Template deleted successfully" })
  } catch (err) {
    console.error("Error deleting template:", err)
    res.status(500).json({ error: "Internal server error" })
  }
})

// Create a trip from a template
router.post("/:id/create-trip", async (req: Request, res: Response) => {
  const { id } = req.params
  const { user_id, name, start_date } = req.body

  if (!user_id || !name || !start_date) {
    return res.status(400).json({ error: "user_id, name, and start_date are required" })
  }

  try {
    // Fetch the template
    const templateResult = await query("SELECT * FROM trip_templates WHERE id = $1", [id])

    if (templateResult.rows.length === 0) {
      return res.status(404).json({ error: "Template not found" })
    }

    const template = templateResult.rows[0]
    const templateData = template.template_data

    // Calculate end date
    const startDate = new Date(start_date)
    const endDate = new Date(startDate)
    endDate.setDate(endDate.getDate() + templateData.duration_days - 1)

    // Create the trip
    const tripResult = await query(
      "INSERT INTO trips (user_id, name, start_date, end_date, animation_config) VALUES ($1, $2, $3, $4, $5) RETURNING *",
      [
        user_id,
        name,
        start_date,
        endDate.toISOString().split("T")[0],
        JSON.stringify(templateData.animation_config || {}),
      ],
    )

    const trip = tripResult.rows[0]

    // Create trip days
    for (const dayData of templateData.days) {
      const dayDate = new Date(startDate)
      dayDate.setDate(dayDate.getDate() + dayData.day_index)

      const dayResult = await query(
        "INSERT INTO trip_days (trip_id, day_index, date) VALUES ($1, $2, $3) RETURNING *",
        [trip.id, dayData.day_index, dayDate.toISOString().split("T")[0]],
      )

      const tripDay = dayResult.rows[0]

      // Create locations
      for (const location of dayData.locations) {
        await query(
          `INSERT INTO day_locations (
            trip_day_id, country, country_code, city, town, latitude, longitude,
            visit_order, notes, transport_mode, transport_details, transport_cost,
            duration_minutes, start_time, end_time, animation_config, location_coords
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, 
            ST_SetSRID(ST_MakePoint($7, $6), 4326))`,
          [
            tripDay.id,
            location.country,
            location.country_code,
            location.city,
            location.town,
            location.latitude,
            location.longitude,
            location.visit_order,
            location.notes,
            location.transport_mode,
            location.transport_details,
            location.transport_cost,
            location.duration_minutes,
            location.start_time,
            location.end_time,
            JSON.stringify(location.animation_config || {}),
          ],
        )
      }

      // Create features
      for (const feature of dayData.features) {
        await query(
          `INSERT INTO saved_features (
            user_id, list_name, feature, trip_day_id, visit_order,
            transport_mode, transport_details, transport_cost, duration_minutes,
            start_time, end_time, animation_config
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
          [
            user_id,
            feature.list_name,
            JSON.stringify(feature.feature),
            tripDay.id,
            feature.visit_order,
            feature.transport_mode,
            feature.transport_details,
            feature.transport_cost,
            feature.duration_minutes,
            feature.start_time,
            feature.end_time,
            JSON.stringify(feature.animation_config || {}),
          ],
        )
      }
    }

    res.status(201).json(trip)
  } catch (err) {
    console.error("Error creating trip from template:", err)
    res.status(500).json({ error: "Internal server error" })
  }
})

export default router
