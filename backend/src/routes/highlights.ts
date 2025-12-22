import { Router } from "express"

import { authenticateToken } from "../middleware/auth"
import highlightsService from "../services/HighlightsService"

const router = Router()

router.use(authenticateToken)

// GET /api/highlights - Get user's travel highlights
router.get("/", async (req, res, next) => {
  try {
    const userId = (req as any).user.id
    const highlights = await highlightsService.getUserHighlights(userId)
    res.json(highlights)
  } catch (error) {
    next(error)
  }
})

// POST /api/highlights/recalculate - Recalculate user stats
router.post("/recalculate", async (req, res, next) => {
  try {
    const userId = (req as any).user.id
    await highlightsService.recalculateUserStats(userId)
    res.json({ message: "Recalculation completed successfully" })
  } catch (error) {
    next(error)
  }
})

// POST /api/highlights/populate-locations - Populate location data for activities
router.post("/populate-locations", async (req, res, next) => {
  try {
    const userId = (req as any).user.id
    const result = await highlightsService.populateActivityLocations(userId)
    res.json({
      message: "Location data populated successfully",
      ...result,
    })
  } catch (error) {
    next(error)
  }
})

export default router
