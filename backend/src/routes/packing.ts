import { Router } from "express"

import PackingListController from "../controllers/PackingListController"
import { authenticateToken } from "../middleware/auth"
import { checkTripPermission } from "../middleware/permission"

const router = Router()

router.use(authenticateToken)

router.get("/templates", PackingListController.listTemplates)
router.post("/templates", PackingListController.createTemplate)
router.delete("/templates/:id", PackingListController.deleteTemplate)

router.get("/trip/:tripId", checkTripPermission("VIEWER"), PackingListController.listTripItems)
router.post("/trip/:tripId", checkTripPermission("EDITOR"), PackingListController.createTripItem)
router.put("/item/:id", checkTripPermission("EDITOR"), PackingListController.updateTripItem)
router.delete("/item/:id", checkTripPermission("EDITOR"), PackingListController.deleteTripItem)
router.post("/trip/:tripId/import", checkTripPermission("EDITOR"), PackingListController.addFromTemplates)

export default router
