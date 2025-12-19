import { Router } from "express"

import ChecklistController from "../controllers/ChecklistController"
import { authenticateToken } from "../middleware/auth"

const router = Router()

router.use(authenticateToken)

router.get("/templates", ChecklistController.listTemplates)
router.post("/templates", ChecklistController.createTemplate)
router.delete("/templates/:id", ChecklistController.deleteTemplate)
router.get("/trip/:tripId", ChecklistController.listTripItems)
router.post("/trip/:tripId", ChecklistController.createTripItem)
router.put("/item/:id", ChecklistController.updateTripItem)
router.delete("/item/:id", ChecklistController.deleteTripItem)
router.post("/trip/:tripId/import", ChecklistController.addFromTemplates)

export default router
