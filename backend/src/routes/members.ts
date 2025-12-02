import express, { Request, Response } from "express"

import { query } from "../db"
import { authMiddleware, AuthRequest } from "../middleware/auth"

const router = express.Router()

router.use(authMiddleware)

// Add member to trip
router.post("/trips/:tripId/members", async (req: AuthRequest, res: Response) => {
  const { tripId } = req.params
  const { user_id, name, email, role = "member", color } = req.body

  if (!name) {
    return res.status(400).json({ error: "Name is required" })
  }

  try {
    // Check for duplicate
    if (user_id) {
      const existing = await query("SELECT id FROM trip_members WHERE trip_id = $1 AND user_id = $2", [tripId, user_id])

      if (existing.rows.length > 0) {
        return res.status(400).json({ error: "User is already a member of this trip" })
      }
    }

    const result = await query(
      `INSERT INTO trip_members (trip_id, user_id, name, email, role, color)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *`,
      [tripId, user_id || null, name, email, role, color],
    )

    res.status(201).json(result.rows[0])
  } catch (error) {
    console.error("Error adding trip member:", error)
    res.status(500).json({ error: "Internal server error" })
  }
})

// Get trip members
router.get("/trips/:tripId/members", async (req: Request, res: Response) => {
  const { tripId } = req.params

  try {
    const result = await query(
      `SELECT tm.*, u.email as user_email
      FROM trip_members tm
      LEFT JOIN users u ON tm.user_id = u.id
      WHERE tm.trip_id = $1
      ORDER BY tm.created_at`,
      [tripId],
    )

    res.json(result.rows)
  } catch (error) {
    console.error("Error fetching trip members:", error)
    res.status(500).json({ error: "Internal server error" })
  }
})

// Update trip member
router.put("/trips/:tripId/members/:memberId", async (req: Request, res: Response) => {
  const { tripId, memberId } = req.params
  const { name, email, role, color } = req.body

  try {
    const fields: string[] = []
    const values: (string | number | boolean | null)[] = []
    let paramCount = 1

    if (name !== undefined) {
      fields.push(`name = $${paramCount}`)
      values.push(name)
      paramCount++
    }
    if (email !== undefined) {
      fields.push(`email = $${paramCount}`)
      values.push(email)
      paramCount++
    }
    if (role !== undefined) {
      fields.push(`role = $${paramCount}`)
      values.push(role)
      paramCount++
    }
    if (color !== undefined) {
      fields.push(`color = $${paramCount}`)
      values.push(color)
      paramCount++
    }

    if (fields.length === 0) {
      return res.status(400).json({ error: "No fields to update" })
    }

    values.push(memberId, tripId)

    const result = await query(
      `UPDATE trip_members 
      SET ${fields.join(", ")}
      WHERE id = $${paramCount} AND trip_id = $${paramCount + 1}
      RETURNING *`,
      values,
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Trip member not found" })
    }

    res.json(result.rows[0])
  } catch (error) {
    console.error("Error updating trip member:", error)
    res.status(500).json({ error: "Internal server error" })
  }
})

// Delete trip member
router.delete("/trips/:tripId/members/:memberId", async (req: Request, res: Response) => {
  const { tripId, memberId } = req.params

  try {
    // Check if member has expenses
    const expenseCheck = await query("SELECT COUNT(*) as count FROM expenses WHERE paid_by = $1", [memberId])

    if (parseInt(expenseCheck.rows[0].count) > 0) {
      return res.status(400).json({
        error: "Cannot delete member who has paid expenses. Reassign expenses first.",
      })
    }

    const result = await query("DELETE FROM trip_members WHERE id = $1 AND trip_id = $2 RETURNING id", [
      memberId,
      tripId,
    ])

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Trip member not found" })
    }

    res.json({ message: "Trip member deleted successfully" })
  } catch (error) {
    console.error("Error deleting trip member:", error)
    res.status(500).json({ error: "Internal server error" })
  }
})

export default router
