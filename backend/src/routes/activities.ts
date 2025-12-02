import express, { Request, Response } from "express"

import { query } from "../db"
import { authMiddleware, AuthRequest } from "../middleware/auth"

const router = express.Router()

// All routes require authentication
router.use(authMiddleware)

// Create activity
router.post("/trips/:tripId/activities", async (req: AuthRequest, res: Response) => {
  const { tripId } = req.params
  const {
    trip_day_id,
    activity_type,
    name,
    description,
    location, // {lat, lng}
    scheduled_start,
    scheduled_end,
    duration_minutes,
    currency = "AUD",
    estimated_cost,
    notes,
    status = "planned",
    priority = "normal",
    is_flexible = false,
  } = req.body

  try {
    const locationCoords = location ? `ST_SetSRID(ST_MakePoint(${location.lng}, ${location.lat}), 4326)` : "NULL"

    const result = await query(
      `INSERT INTO activities (
        trip_id, trip_day_id, activity_type, name, description,
        location_coords, scheduled_start, scheduled_end, duration_minutes,
        currency, estimated_cost, notes, status, priority, is_flexible,
        created_by
      ) VALUES ($1, $2, $3, $4, $5, ${locationCoords}, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *,
        ST_X(location_coords) as longitude,
        ST_Y(location_coords) as latitude`,
      [
        tripId,
        trip_day_id,
        activity_type,
        name,
        description,
        scheduled_start,
        scheduled_end,
        duration_minutes,
        currency,
        estimated_cost,
        notes,
        status,
        priority,
        is_flexible,
        req.user?.userId,
      ],
    )

    res.status(201).json(result.rows[0])
  } catch (error) {
    console.error("Error creating activity:", error)
    res.status(500).json({ error: "Internal server error" })
  }
})

// Get activities for trip
router.get("/trips/:tripId/activities", async (req: Request, res: Response) => {
  const { tripId } = req.params

  try {
    const result = await query(
      `SELECT *,
        ST_X(location_coords) as longitude,
        ST_Y(location_coords) as latitude
      FROM activities
      WHERE trip_id = $1
      ORDER BY scheduled_start NULLS LAST, created_at`,
      [tripId],
    )

    res.json(result.rows)
  } catch (error) {
    console.error("Error fetching activities:", error)
    res.status(500).json({ error: "Internal server error" })
  }
})

// Get single activity
router.get("/activities/:activityId", async (req: Request, res: Response) => {
  const { activityId } = req.params

  try {
    const activityResult = await query(
      `SELECT *,
        ST_X(location_coords) as longitude,
        ST_Y(location_coords) as latitude
      FROM activities
      WHERE id = $1`,
      [activityId],
    )

    if (activityResult.rows.length === 0) {
      return res.status(404).json({ error: "Activity not found" })
    }

    const activity = activityResult.rows[0]

    // Get participants
    const participantsResult = await query(
      `SELECT tm.* 
      FROM trip_members tm
      JOIN activity_participants ap ON tm.id = ap.member_id
      WHERE ap.activity_id = $1`,
      [activityId],
    )

    // Get comments
    const commentsResult = await query(
      `SELECT ac.*, u.email as user_email
      FROM activity_comments ac
      JOIN users u ON ac.user_id = u.id
      WHERE ac.activity_id = $1
      ORDER BY ac.created_at DESC`,
      [activityId],
    )

    // Get photos
    const photosResult = await query("SELECT * FROM trip_photos WHERE activity_id = $1 ORDER BY taken_at DESC", [
      activityId,
    ])

    res.json({
      ...activity,
      participants: participantsResult.rows,
      comments: commentsResult.rows,
      photos: photosResult.rows,
    })
  } catch (error) {
    console.error("Error fetching activity:", error)
    res.status(500).json({ error: "Internal server error" })
  }
})

// Update activity
router.put("/activities/:activityId", async (req: AuthRequest, res: Response) => {
  const { activityId } = req.params
  const updates = req.body

  try {
    const fields: string[] = []
    const values: (string | number | boolean | null)[] = []
    let paramCount = 1

    // Build dynamic update query
    Object.keys(updates).forEach((key) => {
      if (key === "location" && updates[key]) {
        fields.push(`location_coords = ST_SetSRID(ST_MakePoint($${paramCount}, $${paramCount + 1}), 4326)`)
        values.push(updates[key].lng, updates[key].lat)
        paramCount += 2
      } else if (key !== "location") {
        fields.push(`${key} = $${paramCount}`)
        values.push(updates[key])
        paramCount++
      }
    })

    if (fields.length === 0) {
      return res.status(400).json({ error: "No fields to update" })
    }

    fields.push(`updated_by = $${paramCount}`)
    values.push(req.user?.userId || null)
    paramCount++

    values.push(activityId)

    const result = await query(
      `UPDATE activities 
      SET ${fields.join(", ")}
      WHERE id = $${paramCount}
      RETURNING *,
        ST_X(location_coords) as longitude,
        ST_Y(location_coords) as latitude`,
      values,
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Activity not found" })
    }

    res.json(result.rows[0])
  } catch (error) {
    console.error("Error updating activity:", error)
    res.status(500).json({ error: "Internal server error" })
  }
})

// Delete activity
router.delete("/activities/:activityId", async (req: Request, res: Response) => {
  const { activityId } = req.params

  try {
    // Check for transport alternatives
    const transportCheck = await query(
      `SELECT COUNT(*) as count FROM transport_alternatives 
      WHERE from_activity_id = $1 OR to_activity_id = $1`,
      [activityId],
    )

    if (parseInt(transportCheck.rows[0].count) > 0) {
      return res.status(400).json({
        error: "Cannot delete activity with transport alternatives. Delete transport alternatives first.",
      })
    }

    const result = await query("DELETE FROM activities WHERE id = $1 RETURNING id", [activityId])

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Activity not found" })
    }

    res.json({ message: "Activity deleted successfully" })
  } catch (error) {
    console.error("Error deleting activity:", error)
    res.status(500).json({ error: "Internal server error" })
  }
})

// Detect conflicts
router.get("/trips/:tripId/activities/conflicts", async (req: Request, res: Response) => {
  const { tripId } = req.params

  try {
    const result = await query(
      `SELECT 
        a1.id as activity1_id,
        a1.name as activity1_name,
        a1.scheduled_start as activity1_start,
        a1.scheduled_end as activity1_end,
        a2.id as activity2_id,
        a2.name as activity2_name,
        a2.scheduled_start as activity2_start,
        a2.scheduled_end as activity2_end
      FROM activities a1
      JOIN activities a2 ON a1.trip_id = a2.trip_id AND a1.id < a2.id
      WHERE a1.trip_id = $1
        AND a1.scheduled_start IS NOT NULL
        AND a1.scheduled_end IS NOT NULL
        AND a2.scheduled_start IS NOT NULL
        AND a2.scheduled_end IS NOT NULL
        AND (
          (a1.scheduled_start, a1.scheduled_end) OVERLAPS (a2.scheduled_start, a2.scheduled_end)
        )`,
      [tripId],
    )

    res.json(result.rows)
  } catch (error) {
    console.error("Error detecting conflicts:", error)
    res.status(500).json({ error: "Internal server error" })
  }
})

export default router
