import { Router } from "express"
import { authenticateToken } from "../middleware/auth"
import ActivityController from "../controllers/ActivityController"

const router = Router()

router.use(authenticateToken)

router.get("/", ActivityController.listActivities)
router.post("/", ActivityController.createActivity)
router.get("/:id", ActivityController.getActivity)
router.put("/:id", ActivityController.updateActivity)
router.delete("/:id", ActivityController.deleteActivity)
router.post("/:id/copy", ActivityController.copyActivity)
router.post("/reorder", ActivityController.reorder)

router.post("/:id/participants", ActivityController.addParticipant)
router.delete("/:id/participants/:memberId", ActivityController.removeParticipant)

export default router
