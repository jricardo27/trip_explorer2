import { Router } from "express"
import * as ExpenseController from "../controllers/ExpenseController"
import { authenticateToken } from "../middleware/auth"

const router = Router()

router.use(authenticateToken)

// Note: getExpenses is typically by trip, so expected route is /api/trips/:tripId/expenses
// But we can also have GET /api/expenses/:id details
// If mounting at /api/expenses, we need logic.
// For create/update/delete, /api/expenses is fine.
// For list, we might want to query by tripId? or put list in trips router.
// The implementation plan said GET /api/trips/:id/expenses.

router.post("/", ExpenseController.createExpense)
router.put("/:id", ExpenseController.updateExpense)
router.delete("/:id", ExpenseController.deleteExpense)

export default router
