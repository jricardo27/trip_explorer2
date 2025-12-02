import express, { Request, Response } from "express"

import { query } from "../db"
import { authMiddleware } from "../middleware/auth"

const router = express.Router()

router.use(authMiddleware)

// Set or update budget
router.post("/trips/:tripId/budgets", async (req: Request, res: Response) => {
  const { tripId } = req.params
  const { category, amount, currency = "AUD", alert_threshold_percentage = 80 } = req.body

  if (!category || !amount) {
    return res.status(400).json({ error: "Missing required fields: category, amount" })
  }

  try {
    const result = await query(
      `INSERT INTO budgets (trip_id, category, amount, currency, alert_threshold_percentage)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (trip_id, category)
      DO UPDATE SET amount = $3, currency = $4, alert_threshold_percentage = $5
      RETURNING *`,
      [tripId, category, amount, currency, alert_threshold_percentage],
    )

    res.status(201).json(result.rows[0])
  } catch (error) {
    console.error("Error setting budget:", error)
    res.status(500).json({ error: "Internal server error" })
  }
})

// Get budgets for trip
router.get("/trips/:tripId/budgets", async (req: Request, res: Response) => {
  const { tripId } = req.params

  try {
    // Get budgets with calculated spent amounts
    const result = await query(
      `SELECT 
        b.*,
        COALESCE(spent.total, 0) as actual_spent,
        b.amount - COALESCE(spent.total, 0) as actual_remaining,
        CASE 
          WHEN b.amount > 0 THEN (COALESCE(spent.total, 0) / b.amount * 100)
          ELSE 0
        END as percentage_spent
      FROM budgets b
      LEFT JOIN (
        SELECT category, SUM(amount_in_trip_currency) as total
        FROM expenses
        WHERE trip_id = $1
        GROUP BY category
      ) spent ON b.category = spent.category
      WHERE b.trip_id = $1
      ORDER BY b.category`,
      [tripId],
    )

    // Check for alerts
    const budgetsWithAlerts = result.rows.map((budget) => ({
      ...budget,
      alert: parseFloat(budget.percentage_spent) >= budget.alert_threshold_percentage,
    }))

    res.json(budgetsWithAlerts)
  } catch (error) {
    console.error("Error fetching budgets:", error)
    res.status(500).json({ error: "Internal server error" })
  }
})

// Update budget
router.put("/budgets/:budgetId", async (req: Request, res: Response) => {
  const { budgetId } = req.params
  const { amount, alert_threshold_percentage } = req.body

  try {
    const fields: string[] = []
    const values: (string | number | boolean | null)[] = []
    let paramCount = 1

    if (amount !== undefined) {
      fields.push(`amount = $${paramCount}`)
      values.push(amount)
      paramCount++
    }

    if (alert_threshold_percentage !== undefined) {
      fields.push(`alert_threshold_percentage = $${paramCount}`)
      values.push(alert_threshold_percentage)
      paramCount++
    }

    if (fields.length === 0) {
      return res.status(400).json({ error: "No fields to update" })
    }

    values.push(budgetId)

    const result = await query(`UPDATE budgets SET ${fields.join(", ")} WHERE id = $${paramCount} RETURNING *`, values)

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Budget not found" })
    }

    res.json(result.rows[0])
  } catch (error) {
    console.error("Error updating budget:", error)
    res.status(500).json({ error: "Internal server error" })
  }
})

// Delete budget
router.delete("/budgets/:budgetId", async (req: Request, res: Response) => {
  const { budgetId } = req.params

  try {
    const result = await query("DELETE FROM budgets WHERE id = $1 RETURNING id", [budgetId])

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Budget not found" })
    }

    res.json({ message: "Budget deleted successfully" })
  } catch (error) {
    console.error("Error deleting budget:", error)
    res.status(500).json({ error: "Internal server error" })
  }
})

export default router
