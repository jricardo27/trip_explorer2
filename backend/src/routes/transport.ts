import { Router } from "express"

import TransportController from "../controllers/TransportController"
import { authenticateToken } from "../middleware/auth"
import { checkTripPermission } from "../middleware/permission"

const router = Router()

router.use(authenticateToken)

router.get("/", checkTripPermission("VIEWER"), TransportController.listTransport)
router.post("/", checkTripPermission("EDITOR"), TransportController.createTransport)
// Specific routes must come before parameterized routes
router.put("/deselect-all", checkTripPermission("EDITOR"), TransportController.deselectAll)
// Endpoint to fetch transport options for a specific segment
router.post("/fetch-segment", checkTripPermission("EDITOR"), TransportController.fetchSegmentTransport)
router.get("/:id", checkTripPermission("VIEWER"), TransportController.getTransport)
router.put("/:id", checkTripPermission("EDITOR"), TransportController.updateTransport)
router.delete("/:id", checkTripPermission("EDITOR"), TransportController.deleteTransport)
router.put("/:id/select", checkTripPermission("EDITOR"), TransportController.selectTransport)

export default router
