import express, { Request, Response } from "express"

import { query, pool } from "../db"
import { authMiddleware, AuthRequest } from "../middleware/auth"
import { calculateRoute, calculateRouteAlternatives, estimateRouteDuration } from "../services/routing"
import { calculateScheduleImpact, applyScheduleUpdates } from "../services/scheduleAdjustment"
import { validateTransportAlternative } from "../services/transportValidation"

const router = express.Router()

router.use(authMiddleware)

// Create transport alternative
router.post("/transport-alternatives", async (req: AuthRequest, res: Response) => {
  const {
    trip_id,
    from_activity_id,
    to_activity_id,
    name,
    transport_mode,
    duration_minutes,
    buffer_minutes = 0,
    cost,
    currency = "AUD",
    description,
    notes,
    pros = [],
    cons = [],
  } = req.body

  if (!trip_id || !from_activity_id || !to_activity_id || !name || !transport_mode || !duration_minutes) {
    return res.status(400).json({
      error:
        "Missing required fields: trip_id, from_activity_id, to_activity_id, name, transport_mode, duration_minutes",
    })
  }

  try {
    const result = await query(
      `INSERT INTO transport_alternatives (
        trip_id, from_activity_id, to_activity_id, name, transport_mode,
        duration_minutes, buffer_minutes, cost, currency, description, notes, pros, cons
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *`,
      [
        trip_id,
        from_activity_id,
        to_activity_id,
        name,
        transport_mode,
        duration_minutes,
        buffer_minutes,
        cost,
        currency,
        description,
        notes,
        pros,
        cons,
      ],
    )

    res.status(201).json(result.rows[0])
  } catch (error) {
    console.error("Error creating transport alternative:", error)
    res.status(500).json({ error: "Internal server error" })
  }
})

// Get transport alternatives between two activities
router.get("/activities/:fromId/transport-to/:toId", async (req: Request, res: Response) => {
  const { fromId, toId } = req.params

  try {
    const result = await query(
      `SELECT * FROM transport_alternatives
      WHERE from_activity_id = $1 AND to_activity_id = $2
      ORDER BY is_selected DESC, cost ASC NULLS LAST`,
      [fromId, toId],
    )

    res.json(result.rows)
  } catch (error) {
    console.error("Error fetching transport alternatives:", error)
    res.status(500).json({ error: "Internal server error" })
  }
})

// Update transport alternative
router.put("/transport-alternatives/:id", async (req: Request, res: Response) => {
  const { id } = req.params
  const updates = req.body

  try {
    const fields: string[] = []
    const values: (string | number | boolean | null)[] = []
    let paramCount = 1

    Object.keys(updates).forEach((key) => {
      fields.push(`${key} = $${paramCount}`)
      values.push(updates[key])
      paramCount++
    })

    if (fields.length === 0) {
      return res.status(400).json({ error: "No fields to update" })
    }

    values.push(id)

    const result = await query(
      `UPDATE transport_alternatives 
      SET ${fields.join(", ")}
      WHERE id = $${paramCount}
      RETURNING *`,
      values,
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Transport alternative not found" })
    }

    res.json(result.rows[0])
  } catch (error) {
    console.error("Error updating transport alternative:", error)
    res.status(500).json({ error: "Internal server error" })
  }
})

// Delete transport alternative
router.delete("/transport-alternatives/:id", async (req: Request, res: Response) => {
  const { id } = req.params

  try {
    const result = await query("DELETE FROM transport_alternatives WHERE id = $1 RETURNING id", [id])

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Transport alternative not found" })
    }

    res.json({ message: "Transport alternative deleted successfully" })
  } catch (error) {
    console.error("Error deleting transport alternative:", error)
    res.status(500).json({ error: "Internal server error" })
  }
})

// Select transport alternative
router.post("/transport-alternatives/:id/select", async (req: Request, res: Response) => {
  const { id } = req.params

  const client = await pool.connect()

  try {
    await client.query("BEGIN")

    // Get the alternative
    const altResult = await client.query("SELECT * FROM transport_alternatives WHERE id = $1", [id])

    if (altResult.rows.length === 0) {
      await client.query("ROLLBACK")
      return res.status(404).json({ error: "Transport alternative not found" })
    }

    const alternative = altResult.rows[0]

    // Unselect current selected alternative for this connection
    await client.query(
      `UPDATE transport_alternatives 
      SET is_selected = FALSE
      WHERE from_activity_id = $1 AND to_activity_id = $2 AND is_selected = TRUE`,
      [alternative.from_activity_id, alternative.to_activity_id],
    )

    // Select this alternative
    await client.query("UPDATE transport_alternatives SET is_selected = TRUE WHERE id = $1", [id])

    await client.query("COMMIT")

    // Calculate schedule impact
    const impact = await calculateScheduleImpact(id)

    await client.query("COMMIT")

    res.json({
      message: "Transport alternative selected successfully",
      alternative: { ...alternative, is_selected: true },
      impact,
    })
  } catch (error) {
    await client.query("ROLLBACK")
    console.error("Error selecting transport alternative:", error)
    res.status(500).json({ error: "Internal server error" })
  } finally {
    client.release()
  }
})

// Validate transport alternative (Week 5)
router.get("/transport-alternatives/:id/validate", async (req: Request, res: Response) => {
  const { id } = req.params

  try {
    const validation = await validateTransportAlternative(id)
    res.json(validation)
  } catch (error) {
    console.error("Error validating transport:", error)
    res.status(500).json({ error: "Internal server error" })
  }
})

// Calculate route using OSRM (Week 5)
router.post("/calculate-route", async (req: Request, res: Response) => {
  const { from, to, mode } = req.body

  if (!from || !to || !from.lat || !from.lng || !to.lat || !to.lng) {
    return res.status(400).json({
      error: "Missing required fields: from {lat, lng}, to {lat, lng}",
    })
  }

  try {
    const route = await calculateRoute({ from, to, mode })
    res.json(route)
  } catch (error) {
    console.error("Error calculating route:", error)

    // Fallback to estimation
    const estimated = estimateRouteDuration(from, to, mode || "driving")
    res.json({
      duration_minutes: estimated,
      distance_meters: null,
      geometry: null,
      estimated: true,
      error: "Route calculation failed, using estimation",
    })
  }
})

// Calculate multiple route alternatives (Week 5)
router.post("/calculate-route-alternatives", async (req: Request, res: Response) => {
  const { from, to } = req.body

  if (!from || !to || !from.lat || !from.lng || !to.lat || !to.lng) {
    return res.status(400).json({
      error: "Missing required fields: from {lat, lng}, to {lat, lng}",
    })
  }

  try {
    const routes = await calculateRouteAlternatives(from, to)
    res.json(routes)
  } catch (error) {
    console.error("Error calculating route alternatives:", error)
    res.status(500).json({ error: "Internal server error" })
  }
})

// Preview schedule impact (Week 5)
router.get("/transport-alternatives/:id/impact-preview", async (req: Request, res: Response) => {
  const { id } = req.params

  try {
    const impact = await calculateScheduleImpact(id)
    res.json(impact)
  } catch (error) {
    console.error("Error calculating impact:", error)
    res.status(500).json({ error: "Internal server error" })
  }
})

// Apply schedule updates (Week 5)
router.post("/apply-schedule-updates", async (req: Request, res: Response) => {
  const { updates } = req.body

  if (!Array.isArray(updates)) {
    return res.status(400).json({ error: "Updates must be an array" })
  }

  try {
    await applyScheduleUpdates(updates)
    res.json({ message: "Schedule updates applied successfully" })
  } catch (error) {
    console.error("Error applying updates:", error)
    res.status(500).json({ error: "Internal server error" })
  }
})

export default router
