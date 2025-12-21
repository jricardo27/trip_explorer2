import { Router } from "express"

import ActivityController from "../controllers/ActivityController"
import { authenticateToken } from "../middleware/auth"
import { checkTripPermission } from "../middleware/permission"

const router = Router()

router.use(authenticateToken)

// GET /api/activities?tripId=... (permission checked inside controller or via query param)
// For activities, we often have tripId in query or we need to look up activity first.
// The middleware handles req.params.tripId, req.body.tripId, req.query.tripId, req.params.id

router.get("/", checkTripPermission("VIEWER"), ActivityController.listActivities)
router.post("/", checkTripPermission("EDITOR"), ActivityController.createActivity)
router.get("/:id", checkTripPermission("VIEWER"), ActivityController.getActivity)
router.put("/:id", checkTripPermission("EDITOR"), ActivityController.updateActivity)
router.delete("/:id", checkTripPermission("EDITOR"), ActivityController.deleteActivity)
router.post("/:id/copy", checkTripPermission("EDITOR"), ActivityController.copyActivity)
router.post("/reorder", checkTripPermission("EDITOR"), ActivityController.reorder)

router.post("/:id/participants", checkTripPermission("EDITOR"), ActivityController.addParticipant)
router.delete("/:id/participants/:memberId", checkTripPermission("EDITOR"), ActivityController.removeParticipant)

export default router
