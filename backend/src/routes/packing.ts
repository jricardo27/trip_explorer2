import { Router } from "express"

import PackingListController from "../controllers/PackingListController"
import { authenticateToken } from "../middleware/auth"

const router = Router()

router.use(authenticateToken)

router.get("/templates", PackingListController.listTemplates)
router.post("/templates", PackingListController.createTemplate)
router.delete("/templates/:id", PackingListController.deleteTemplate)
router.get("/trip/:tripId", PackingListController.listTripItems)
router.post("/trip/:tripId", PackingListController.createTripItem)
router.put("/item/:id", PackingListController.updateTripItem)
router.delete("/item/:id", PackingListController.deleteTripItem)
router.post("/trip/:tripId/import", PackingListController.addFromTemplates)

export default router
