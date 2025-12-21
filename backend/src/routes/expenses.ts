import { Router } from "express"

import * as ExpenseController from "../controllers/ExpenseController"
import { authenticateToken } from "../middleware/auth"
import { checkTripPermission } from "../middleware/permission"

const router = Router()

router.use(authenticateToken)

router.get("/trip/:tripId", checkTripPermission("VIEWER"), ExpenseController.getExpenses)
router.post("/", checkTripPermission("EDITOR"), ExpenseController.createExpense)
router.put("/:id", checkTripPermission("EDITOR"), ExpenseController.updateExpense)
router.delete("/:id", checkTripPermission("EDITOR"), ExpenseController.deleteExpense)

export default router
