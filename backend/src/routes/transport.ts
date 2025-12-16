import { Router } from "express"

import TransportController from "../controllers/TransportController"
import { authenticateToken } from "../middleware/auth"

const router = Router()

router.use(authenticateToken)

router.get("/", TransportController.listTransport)
router.post("/", TransportController.createTransport)
router.get("/:id", TransportController.getTransport)
router.put("/:id", TransportController.updateTransport)
router.delete("/:id", TransportController.deleteTransport)
router.put("/:id/select", TransportController.selectTransport)

export default router
