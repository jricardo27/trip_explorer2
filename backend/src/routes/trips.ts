import { Router, Request, Response } from "express"

import { validate } from "../middleware/errorHandler"
import tripService from "../services/TripService"
import { createTripSchema, updateTripSchema } from "../utils/validation"
import { authenticateToken } from "../middleware/auth"

const router = Router()

// Protect all routes
router.use(authenticateToken)

// GET /api/trips - List all trips for a user
router.get("/", async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id
    const filters: any = {}

    if (req.query.is_completed) {
      filters.isCompleted = req.query.is_completed === "true"
    }

    if (req.query.start_after) {
      filters.startAfter = new Date(req.query.start_after as string)
    }

    if (req.query.end_before) {
      filters.endBefore = new Date(req.query.end_before as string)
    }

    const trips = await tripService.listTrips(userId, filters)

    res.json({ data: trips })
  } catch (error) {
    res.status(500).json({
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to fetch trips",
      },
    })
  }
})

// POST /api/trips - Create a new trip
router.post("/", validate(createTripSchema), async (req: Request, res: Response) => {
  try {
    const trip = await tripService.createTrip({
      userId: (req as any).user.id,
      name: req.body.name,
      startDate: new Date(req.body.startDate),
      endDate: new Date(req.body.endDate),
      budget: req.body.budget,
      defaultCurrency: req.body.defaultCurrency,
      timezone: req.body.timezone,
    })

    res.status(201).json({ data: trip })
  } catch (error) {
    res.status(500).json({
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to create trip",
      },
    })
  }
})

// GET /api/trips/:id - Get trip details
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const trip = await tripService.getTripById(req.params.id, (req as any).user.id)

    if (!trip) {
      return res.status(404).json({
        error: {
          code: "NOT_FOUND",
          message: "Trip not found",
        },
      })
    }

    res.json({ data: trip })
  } catch (error) {
    res.status(500).json({
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to fetch trip",
      },
    })
  }
})

// PUT /api/trips/:id - Update trip
router.put("/:id", validate(updateTripSchema), async (req: Request, res: Response) => {
  try {
    const updateData: any = {}

    if (req.body.name) updateData.name = req.body.name
    if (req.body.startDate) updateData.startDate = new Date(req.body.startDate)
    if (req.body.endDate) updateData.endDate = new Date(req.body.endDate)
    if (req.body.budget !== undefined) updateData.budget = req.body.budget
    if (req.body.defaultCurrency) updateData.defaultCurrency = req.body.defaultCurrency
    if (req.body.timezone) updateData.timezone = req.body.timezone
    if (req.body.isCompleted !== undefined) updateData.isCompleted = req.body.isCompleted
    if (req.body.isPublic !== undefined) updateData.isPublic = req.body.isPublic

    const trip = await tripService.updateTrip(req.params.id, (req as any).user.id, updateData)

    res.json({ data: trip })
  } catch (error: any) {
    if (error.code === "P2025") {
      return res.status(404).json({
        error: {
          code: "NOT_FOUND",
          message: "Trip not found",
        },
      })
    }

    res.status(500).json({
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to update trip",
      },
    })
  }
})

// DELETE /api/trips/:id - Delete trip
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    await tripService.deleteTrip(req.params.id, (req as any).user.id)

    res.status(204).send()
  } catch (error: any) {
    if (error.code === "P2025") {
      return res.status(404).json({
        error: {
          code: "NOT_FOUND",
          message: "Trip not found",
        },
      })
    }

    res.status(500).json({
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to delete trip",
      },
    })
  }
})

// POST /api/trips/:id/copy - Copy trip
router.post("/:id/copy", async (req: Request, res: Response) => {
  try {
    if (!req.body.name || !req.body.startDate) {
      return res.status(400).json({
        error: {
          code: "MISSING_PARAMETER",
          message: "name and startDate are required",
        },
      })
    }

    const trip = await tripService.copyTrip(
      req.params.id,
      (req as any).user.id,
      req.body.name,
      new Date(req.body.startDate),
    )

    res.status(201).json({ data: trip })
  } catch (error: any) {
    if (error.message === "Trip not found") {
      return res.status(404).json({
        error: {
          code: "NOT_FOUND",
          message: "Trip not found",
        },
      })
    }

    res.status(500).json({
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to copy trip",
      },
    })
  }
})

export default router
