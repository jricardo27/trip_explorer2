import { Router, Request, Response } from "express"

import { validate } from "../middleware/errorHandler"
import tripService from "../services/TripService"
import { createTripSchema, updateTripSchema } from "../utils/validation"
import { authenticateToken } from "../middleware/auth"
import tripMemberService from "../services/TripMemberService"

import expenseRoutes from "./expenses"
import * as ExpenseController from "../controllers/ExpenseController"

const router = Router()

// Protect all routes
router.use(authenticateToken)

// Expenses sub-route or direct controller usage
router.get("/:tripId/expenses", ExpenseController.getExpenses)

// POST /api/trips/import - Import a trip
router.post("/import", async (req: Request, res: Response) => {
  try {
    const trip = await tripService.importTrip(req.body, (req as any).user.id)
    res.status(201).json({ data: trip })
  } catch (error: any) {
    console.error("Import error:", error)
    res.status(500).json({
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to import trip",
        details: error.message
      }
    })
  }
})

// GET /api/trips/export - Export ALL trips
router.get("/export", async (req: Request, res: Response) => {
  try {
    const trips = await tripService.exportAllTrips((req as any).user.id)
    res.json({ data: trips })
  } catch (error: any) {
    res.status(500).json({
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to export trips"
      }
    })
  }
})

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
      currencies: req.body.currencies,
      exchangeRates: req.body.exchangeRates,
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

// GET /api/trips/:id/export - Export a single trip
router.get("/:id/export", async (req: Request, res: Response) => {
  try {
    const trip = await tripService.exportTrip(req.params.id, (req as any).user.id)
    res.json({ data: trip })
  } catch (error: any) {
    res.status(500).json({
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to export trip"
      }
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
    if (req.body.currencies) updateData.currencies = req.body.currencies
    if (req.body.exchangeRates) updateData.exchangeRates = req.body.exchangeRates
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

// PUT /api/trips/:id/days/:dayId - Update trip day
router.put("/:id/days/:dayId", async (req: Request, res: Response) => {
  try {
    const updateData: any = {}

    if (req.body.name) updateData.name = req.body.name
    if (req.body.notes !== undefined) updateData.notes = req.body.notes

    const day = await tripService.updateDay(req.params.id, req.params.dayId, (req as any).user.id, updateData)

    res.json({ data: day })
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
        message: "Failed to update day",
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

// ===== MEMBER ROUTES =====

// GET /api/trips/:id/members - Get all members for a trip
router.get("/:id/members", async (req: Request, res: Response) => {
  try {
    const members = await tripMemberService.getMembers(req.params.id, (req as any).user.id)
    res.json({ data: members })
  } catch (error: any) {
    if (error.message === "Trip not found or access denied") {
      return res.status(404).json({
        error: {
          code: "NOT_FOUND",
          message: error.message,
        },
      })
    }
    res.status(500).json({
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to fetch members",
      },
    })
  }
})

// POST /api/trips/:id/members - Add a member to a trip
router.post("/:id/members", async (req: Request, res: Response) => {
  try {
    const member = await tripMemberService.addMember(req.params.id, (req as any).user.id, {
      name: req.body.name,
      email: req.body.email,
      role: req.body.role,
      color: req.body.color,
      avatarUrl: req.body.avatarUrl,
    })
    res.status(201).json({ data: member })
  } catch (error: any) {
    if (error.message === "Trip not found or access denied") {
      return res.status(404).json({
        error: {
          code: "NOT_FOUND",
          message: error.message,
        },
      })
    }
    if (error.message === "Member with this email already exists") {
      return res.status(409).json({
        error: {
          code: "CONFLICT",
          message: error.message,
        },
      })
    }
    res.status(500).json({
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to add member",
      },
    })
  }
})

// PUT /api/trips/:id/members/:memberId - Update a member
router.put("/:id/members/:memberId", async (req: Request, res: Response) => {
  try {
    const member = await tripMemberService.updateMember(req.params.memberId, (req as any).user.id, {
      name: req.body.name,
      email: req.body.email,
      role: req.body.role,
      color: req.body.color,
      avatarUrl: req.body.avatarUrl,
    })
    res.json({ data: member })
  } catch (error: any) {
    if (error.message === "Member not found or access denied") {
      return res.status(404).json({
        error: {
          code: "NOT_FOUND",
          message: error.message,
        },
      })
    }
    res.status(500).json({
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to update member",
      },
    })
  }
})

// DELETE /api/trips/:id/members/:memberId - Remove a member
router.delete("/:id/members/:memberId", async (req: Request, res: Response) => {
  try {
    await tripMemberService.removeMember(req.params.memberId, (req as any).user.id)
    res.status(204).send()
  } catch (error: any) {
    if (error.message === "Member not found or access denied") {
      return res.status(404).json({
        error: {
          code: "NOT_FOUND",
          message: error.message,
        },
      })
    }
    res.status(500).json({
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to remove member",
      },
    })
  }
})

export default router
