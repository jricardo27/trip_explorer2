import express from "express"

import {
  createAnimation,
  deleteAnimation,
  getTripAnimations,
  updateAnimation,
} from "../controllers/animationController"
import { authenticateToken } from "../middleware/auth"

const router = express.Router()

// All routes require authentication
router.use(authenticateToken)

// Note: getTripAnimations is mounted under /trips, see trips.ts?
// Actually I will mount this separate router under /api/animations for CRUD on ID,
// and logic for fetching by trip might belong here or in trips.
// But following REST:
// GET /api/trips/:tripId/animations -> getTripAnimations
// POST /api/trips/:tripId/animations -> createAnimation
// PUT /api/animations/:id -> updateAnimation
// DELETE /api/animations/:id -> deleteAnimation

// I will define the trip-relative ones in trips.ts or handle everything here if I mount it appropriately.
// Let's stick to placing pure animation routes here.
// But wait, create depends on tripId.
// I will mount this router at /api/animations.
// And I will add specific routes for trip-related actions usually under /api/trips, but I can put them here if I use full path.

router.get("/trip/:tripId", getTripAnimations)
router.post("/trip/:tripId", createAnimation)
router.put("/:id", updateAnimation)
router.delete("/:id", deleteAnimation)

export default router
