import { query } from "../db"

interface BudgetAlert {
  budget_id: string
  category: string
  amount: number
  spent: number
  remaining: number
  percentage_spent: number
  threshold: number
  exceeded: boolean
}

/**
 * Update spent amounts for all budgets in a trip
 */
export async function updateBudgetSpent(tripId: string): Promise<void> {
  try {
    // Get all budgets for the trip
    const budgetsResult = await query("SELECT id, category FROM budgets WHERE trip_id = $1", [tripId])

    for (const budget of budgetsResult.rows) {
      // Calculate total spent for this category
      const spentResult = await query(
        `SELECT COALESCE(SUM(amount_in_trip_currency), 0) as total
         FROM expenses
         WHERE trip_id = $1 AND category = $2`,
        [tripId, budget.category],
      )

      const spent = spentResult.rows[0].total

      // Update budget
      await query("UPDATE budgets SET spent_amount = $1 WHERE id = $2", [spent, budget.id])
    }
  } catch (error) {
    console.error("Error updating budget spent:", error)
    throw error
  }
}

/**
 * Check for budget alerts and return any that exceed threshold
 */
export async function checkBudgetAlerts(tripId: string): Promise<BudgetAlert[]> {
  try {
    const result = await query(
      `SELECT 
        b.id as budget_id,
        b.category,
        b.amount,
        b.spent_amount as spent,
        b.remaining_amount as remaining,
        CASE 
          WHEN b.amount > 0 THEN (b.spent_amount / b.amount * 100)
          ELSE 0
        END as percentage_spent,
        b.alert_threshold_percentage as threshold,
        b.alert_sent
      FROM budgets b
      WHERE b.trip_id = $1
        AND b.amount > 0`,
      [tripId],
    )

    const alerts: BudgetAlert[] = []

    for (const row of result.rows) {
      const percentageSpent = parseFloat(row.percentage_spent)
      const threshold = row.threshold || 80

      if (percentageSpent >= threshold && !row.alert_sent) {
        alerts.push({
          budget_id: row.budget_id,
          category: row.category,
          amount: parseFloat(row.amount),
          spent: parseFloat(row.spent),
          remaining: parseFloat(row.remaining),
          percentage_spent: percentageSpent,
          threshold,
          exceeded: percentageSpent >= 100,
        })

        // Mark alert as sent
        await query("UPDATE budgets SET alert_sent = TRUE WHERE id = $1", [row.budget_id])
      }
    }

    return alerts
  } catch (error) {
    console.error("Error checking budget alerts:", error)
    throw error
  }
}

/**
 * Reset alert status when budget is updated
 */
export async function resetBudgetAlert(budgetId: string): Promise<void> {
  try {
    await query("UPDATE budgets SET alert_sent = FALSE WHERE id = $1", [budgetId])
  } catch (error) {
    console.error("Error resetting budget alert:", error)
    throw error
  }
}
