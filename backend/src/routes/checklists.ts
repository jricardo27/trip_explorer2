import { Router } from "express"

import ChecklistController from "../controllers/ChecklistController"
import { authenticateToken } from "../middleware/auth"
import { checkTripPermission } from "../middleware/permission"

const router = Router()

router.use(authenticateToken)

router.get("/templates", ChecklistController.listTemplates)
router.post("/templates", ChecklistController.createTemplate)
router.delete("/templates/:id", ChecklistController.deleteTemplate)

router.get("/trip/:tripId", checkTripPermission("VIEWER"), ChecklistController.listTripItems)
router.post("/trip/:tripId", checkTripPermission("EDITOR"), ChecklistController.createTripItem)
router.put("/item/:id", checkTripPermission("EDITOR"), ChecklistController.updateTripItem)
router.delete("/item/:id", checkTripPermission("EDITOR"), ChecklistController.deleteTripItem)
router.post("/trip/:tripId/import", checkTripPermission("EDITOR"), ChecklistController.addFromTemplates)

export default router
