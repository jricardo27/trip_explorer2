import { Router } from "express"

import { authenticate } from "../middleware/auth"
import dayScenarioService from "../services/DayScenarioService"

const router = Router()

// Get all scenarios for a day
router.get("/days/:dayId/scenarios", authenticate, async (req, res, next) => {
  try {
    const scenarios = await dayScenarioService.getScenariosByDay(req.params.dayId)
    res.json(scenarios)
  } catch (error) {
    next(error)
  }
})

// Create a new scenario
router.post("/days/:dayId/scenarios", authenticate, async (req, res, next) => {
  try {
    const { name, description } = req.body
    const scenario = await dayScenarioService.createScenario({
      tripDayId: req.params.dayId,
      name,
      description,
    })
    res.status(201).json(scenario)
  } catch (error) {
    next(error)
  }
})

// Duplicate a scenario
router.post("/scenarios/:id/duplicate", authenticate, async (req, res, next) => {
  try {
    const { name } = req.body
    const scenario = await dayScenarioService.duplicateScenario(req.params.id, name)
    res.json(scenario)
  } catch (error) {
    next(error)
  }
})

// Select a scenario as the main plan
router.post("/scenarios/:id/select", authenticate, async (req, res, next) => {
  try {
    const scenario = await dayScenarioService.selectScenario(req.params.id)
    res.json(scenario)
  } catch (error) {
    next(error)
  }
})

// Update a scenario
router.patch("/scenarios/:id", authenticate, async (req, res, next) => {
  try {
    const { name, description } = req.body
    const scenario = await dayScenarioService.updateScenario(req.params.id, { name, description })
    res.json(scenario)
  } catch (error) {
    next(error)
  }
})

// Delete a scenario
router.delete("/scenarios/:id", authenticate, async (req, res, next) => {
  try {
    await dayScenarioService.deleteScenario(req.params.id)
    res.status(204).send()
  } catch (error) {
    next(error)
  }
})

// Reorder scenarios
router.post("/days/:dayId/scenarios/reorder", authenticate, async (req, res, next) => {
  try {
    const { updates } = req.body
    await dayScenarioService.reorderScenarios(req.params.dayId, updates)
    res.status(204).send()
  } catch (error) {
    next(error)
  }
})

export default router
