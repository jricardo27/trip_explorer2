import { Router, Request, Response } from "express"

import { validate } from "../middleware/errorHandler"
import activityService from "../services/ActivityService"
import { createActivitySchema, updateActivitySchema } from "../utils/validation"

const router = Router()

// GET /api/trips/:tripId/activities - List activities for a trip
router.get("/:tripId/activities", async (req: Request, res: Response) => {
  try {
    const filters: any = {}

    if (req.query.trip_day_id) {
      filters.tripDayId = req.query.trip_day_id as string
    }

    if (req.query.activity_type) {
      filters.activityType = req.query.activity_type
    }

    if (req.query.status) {
      filters.status = req.query.status
    }

    const activities = await activityService.listActivitiesByTrip(req.params.tripId, filters)

    res.json({ data: activities })
  } catch (error) {
    res.status(500).json({
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to fetch activities",
      },
    })
  }
})

// POST /api/trips/:tripId/activities - Create activity
router.post("/:tripId/activities", validate(createActivitySchema), async (req: Request, res: Response) => {
  try {
    const activity = await activityService.createActivity({
      tripId: req.params.tripId,
      tripDayId: req.body.tripDayId,
      activityType: req.body.activityType,
      name: req.body.name,
      description: req.body.description,
      notes: req.body.notes,
      scheduledStart: req.body.scheduledStart ? new Date(req.body.scheduledStart) : undefined,
      scheduledEnd: req.body.scheduledEnd ? new Date(req.body.scheduledEnd) : undefined,
      durationMinutes: req.body.durationMinutes,
      city: req.body.city,
      country: req.body.country,
      countryCode: req.body.countryCode,
      estimatedCost: req.body.estimatedCost,
      currency: req.body.currency,
    })

    res.status(201).json({ data: activity })
  } catch (error) {
    res.status(500).json({
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to create activity",
      },
    })
  }
})

// GET /api/trips/:tripId/activities/:id - Get activity details
router.get("/:tripId/activities/:id", async (req: Request, res: Response) => {
  try {
    const activity = await activityService.getActivityById(req.params.id)

    if (!activity || activity.tripId !== req.params.tripId) {
      return res.status(404).json({
        error: {
          code: "NOT_FOUND",
          message: "Activity not found",
        },
      })
    }

    res.json({ data: activity })
  } catch (error) {
    res.status(500).json({
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to fetch activity",
      },
    })
  }
})

// PUT /api/trips/:tripId/activities/:id - Update activity
router.put("/:tripId/activities/:id", validate(updateActivitySchema), async (req: Request, res: Response) => {
  try {
    const updateData: any = {}

    if (req.body.name) updateData.name = req.body.name
    if (req.body.description !== undefined) updateData.description = req.body.description
    if (req.body.notes !== undefined) updateData.notes = req.body.notes
    if (req.body.scheduledStart) updateData.scheduledStart = new Date(req.body.scheduledStart)
    if (req.body.scheduledEnd) updateData.scheduledEnd = new Date(req.body.scheduledEnd)
    if (req.body.actualStart) updateData.actualStart = new Date(req.body.actualStart)
    if (req.body.actualEnd) updateData.actualEnd = new Date(req.body.actualEnd)
    if (req.body.durationMinutes) updateData.durationMinutes = req.body.durationMinutes
    if (req.body.status) updateData.status = req.body.status
    if (req.body.priority) updateData.priority = req.body.priority
    if (req.body.estimatedCost !== undefined) updateData.estimatedCost = req.body.estimatedCost
    if (req.body.actualCost !== undefined) updateData.actualCost = req.body.actualCost
    if (req.body.isPaid !== undefined) updateData.isPaid = req.body.isPaid

    const activity = await activityService.updateActivity(req.params.id, updateData)

    res.json({ data: activity })
  } catch (error: any) {
    if (error.code === "P2025") {
      return res.status(404).json({
        error: {
          code: "NOT_FOUND",
          message: "Activity not found",
        },
      })
    }

    res.status(500).json({
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to update activity",
      },
    })
  }
})

// DELETE /api/trips/:tripId/activities/:id - Delete activity
router.delete("/:tripId/activities/:id", async (req: Request, res: Response) => {
  try {
    await activityService.deleteActivity(req.params.id)

    res.status(204).send()
  } catch (error: any) {
    if (error.code === "P2025") {
      return res.status(404).json({
        error: {
          code: "NOT_FOUND",
          message: "Activity not found",
        },
      })
    }

    res.status(500).json({
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to delete activity",
      },
    })
  }
})

// GET /api/trips/:tripId/activities/conflicts - Get scheduling conflicts
router.get("/:tripId/activities/conflicts", async (req: Request, res: Response) => {
  try {
    const conflicts = await activityService.getConflicts(req.params.tripId)

    res.json({ data: conflicts })
  } catch (error) {
    res.status(500).json({
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to fetch conflicts",
      },
    })
  }
})

export default router
