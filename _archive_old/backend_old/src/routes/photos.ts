import express, { Request, Response } from "express"

import { query } from "../db"
import { authMiddleware, AuthRequest } from "../middleware/auth"

const router = express.Router()

router.use(authMiddleware)

// Add photo link
router.post("/trips/:tripId/photos", async (req: AuthRequest, res: Response) => {
  const { tripId } = req.params
  const { activity_id, photo_url, thumbnail_url, caption, taken_at, cloud_provider, cloud_photo_id } = req.body

  if (!photo_url) {
    return res.status(400).json({ error: "photo_url is required" })
  }

  // Validate URL format
  if (!photo_url.match(/^https?:\/\//)) {
    return res.status(400).json({ error: "photo_url must be a valid HTTP/HTTPS URL" })
  }

  try {
    const result = await query(
      `INSERT INTO trip_photos (
        trip_id, activity_id, photo_url, thumbnail_url, caption,
        taken_at, cloud_provider, cloud_photo_id, uploaded_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *`,
      [
        tripId,
        activity_id,
        photo_url,
        thumbnail_url,
        caption,
        taken_at,
        cloud_provider,
        cloud_photo_id,
        req.user?.userId,
      ],
    )

    res.status(201).json(result.rows[0])
  } catch (error) {
    console.error("Error adding photo:", error)
    res.status(500).json({ error: "Internal server error" })
  }
})

// Get photos for trip
router.get("/trips/:tripId/photos", async (req: Request, res: Response) => {
  const { tripId } = req.params
  const { activity_id } = req.query

  try {
    let queryText = "SELECT * FROM trip_photos WHERE trip_id = $1"
    const values: (string | number | boolean | null)[] = [tripId]

    if (activity_id) {
      queryText += " AND activity_id = $2"
      values.push(activity_id as string)
    }

    queryText += " ORDER BY taken_at DESC NULLS LAST, created_at DESC"

    const result = await query(queryText, values)
    res.json(result.rows)
  } catch (error) {
    console.error("Error fetching photos:", error)
    res.status(500).json({ error: "Internal server error" })
  }
})

// Update photo
router.put("/photos/:photoId", async (req: Request, res: Response) => {
  const { photoId } = req.params
  const { caption, taken_at, activity_id } = req.body

  try {
    const fields: string[] = []
    const values: (string | number | boolean | null)[] = []
    let paramCount = 1

    if (caption !== undefined) {
      fields.push(`caption = $${paramCount}`)
      values.push(caption)
      paramCount++
    }

    if (taken_at !== undefined) {
      fields.push(`taken_at = $${paramCount}`)
      values.push(taken_at)
      paramCount++
    }

    if (activity_id !== undefined) {
      fields.push(`activity_id = $${paramCount}`)
      values.push(activity_id)
      paramCount++
    }

    if (fields.length === 0) {
      return res.status(400).json({ error: "No fields to update" })
    }

    values.push(photoId)

    const result = await query(
      `UPDATE trip_photos SET ${fields.join(", ")} WHERE id = $${paramCount} RETURNING *`,
      values,
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Photo not found" })
    }

    res.json(result.rows[0])
  } catch (error) {
    console.error("Error updating photo:", error)
    res.status(500).json({ error: "Internal server error" })
  }
})

// Delete photo
router.delete("/photos/:photoId", async (req: Request, res: Response) => {
  const { photoId } = req.params

  try {
    const result = await query("DELETE FROM trip_photos WHERE id = $1 RETURNING id", [photoId])

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Photo not found" })
    }

    res.json({ message: "Photo deleted successfully" })
  } catch (error) {
    console.error("Error deleting photo:", error)
    res.status(500).json({ error: "Internal server error" })
  }
})

// Link photo to activity
router.put("/photos/:photoId/link-activity", async (req: Request, res: Response) => {
  const { photoId } = req.params
  const { activity_id } = req.body

  try {
    const result = await query("UPDATE trip_photos SET activity_id = $1 WHERE id = $2 RETURNING *", [
      activity_id,
      photoId,
    ])

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Photo not found" })
    }

    res.json(result.rows[0])
  } catch (error) {
    console.error("Error linking photo to activity:", error)
    res.status(500).json({ error: "Internal server error" })
  }
})

export default router
