import express, { Request, Response } from "express"

import { query, pool } from "../db"
import { authMiddleware, AuthRequest } from "../middleware/auth"

const router = express.Router()

router.use(authMiddleware)

// Create expense
router.post("/trips/:tripId/expenses", async (req: AuthRequest, res: Response) => {
  const { tripId } = req.params
  const {
    activity_id,
    description,
    category,
    amount,
    currency = "AUD",
    paid_by,
    payment_method,
    is_shared = false,
    split_type = "equal",
  } = req.body

  if (!description || !category || !amount) {
    return res.status(400).json({
      error: "Missing required fields: description, category, amount",
    })
  }

  const client = await pool.connect()

  try {
    await client.query("BEGIN")

    // Get trip's default currency for conversion
    const tripResult = await client.query("SELECT default_currency FROM trips WHERE id = $1", [tripId])

    const tripCurrency = tripResult.rows[0]?.default_currency || "AUD"

    // Get exchange rate if needed
    let amountInTripCurrency = amount
    let exchangeRate = 1.0

    if (currency !== tripCurrency) {
      const rateResult = await client.query("SELECT get_currency_rate($1, $2, CURRENT_DATE) as rate", [
        currency,
        tripCurrency,
      ])

      exchangeRate = rateResult.rows[0].rate
      if (exchangeRate) {
        amountInTripCurrency = amount * exchangeRate
      }
    }

    // Create expense
    const result = await client.query(
      `INSERT INTO expenses (
        trip_id, activity_id, description, category, amount, currency,
        amount_in_trip_currency, exchange_rate, exchange_rate_date,
        paid_by, payment_method, is_shared, split_type, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_DATE, $9, $10, $11, $12, $13)
      RETURNING *`,
      [
        tripId,
        activity_id,
        description,
        category,
        amount,
        currency,
        amountInTripCurrency,
        exchangeRate,
        paid_by,
        payment_method,
        is_shared,
        split_type,
        req.user?.userId,
      ],
    )

    await client.query("COMMIT")

    res.status(201).json(result.rows[0])
  } catch (error) {
    await client.query("ROLLBACK")
    console.error("Error creating expense:", error)
    res.status(500).json({ error: "Internal server error" })
  } finally {
    client.release()
  }
})

// Get expenses for trip
router.get("/trips/:tripId/expenses", async (req: Request, res: Response) => {
  const { tripId } = req.params
  const { category, start_date, end_date } = req.query

  try {
    let queryText = `
      SELECT e.*, tm.name as paid_by_name
      FROM expenses e
      LEFT JOIN trip_members tm ON e.paid_by = tm.id
      WHERE e.trip_id = $1
    `
    const values: (string | number | boolean | null)[] = [tripId]
    let paramCount = 2

    if (category) {
      queryText += ` AND e.category = $${paramCount}`
      values.push(category as string)
      paramCount++
    }

    if (start_date) {
      queryText += ` AND e.payment_date >= $${paramCount}`
      values.push(start_date as string)
      paramCount++
    }

    if (end_date) {
      queryText += ` AND e.payment_date <= $${paramCount}`
      values.push(end_date as string)
      paramCount++
    }

    queryText += " ORDER BY e.payment_date DESC NULLS LAST, e.created_at DESC"

    const result = await query(queryText, values)

    // Get splits for each expense
    for (const expense of result.rows) {
      const splitsResult = await query(
        `SELECT es.*, tm.name as member_name
        FROM expense_splits es
        JOIN trip_members tm ON es.member_id = tm.id
        WHERE es.expense_id = $1`,
        [expense.id],
      )
      expense.splits = splitsResult.rows
    }

    res.json(result.rows)
  } catch (error) {
    console.error("Error fetching expenses:", error)
    res.status(500).json({ error: "Internal server error" })
  }
})

// Configure expense splits
router.post("/expenses/:expenseId/splits", async (req: Request, res: Response) => {
  const { expenseId } = req.params
  const { splits } = req.body // Array of {member_id, amount?, percentage?}

  if (!Array.isArray(splits) || splits.length === 0) {
    return res.status(400).json({ error: "Splits must be a non-empty array" })
  }

  const client = await pool.connect()

  try {
    await client.query("BEGIN")

    // Get expense
    const expenseResult = await client.query("SELECT * FROM expenses WHERE id = $1", [expenseId])

    if (expenseResult.rows.length === 0) {
      await client.query("ROLLBACK")
      return res.status(404).json({ error: "Expense not found" })
    }

    const expense = expenseResult.rows[0]

    // Delete existing splits
    await client.query("DELETE FROM expense_splits WHERE expense_id = $1", [expenseId])

    // Calculate splits based on type
    let calculatedSplits = splits

    if (expense.split_type === "equal") {
      const amountPerPerson = expense.amount / splits.length
      calculatedSplits = splits.map((split) => ({
        ...split,
        amount: amountPerPerson,
        percentage: (100 / splits.length).toFixed(2),
      }))
    } else if (expense.split_type === "percentage") {
      calculatedSplits = splits.map((split) => ({
        ...split,
        amount: (expense.amount * (split.percentage / 100)).toFixed(2),
      }))
    }

    // Insert new splits
    for (const split of calculatedSplits) {
      await client.query(
        `INSERT INTO expense_splits (expense_id, member_id, amount, percentage)
        VALUES ($1, $2, $3, $4)`,
        [expenseId, split.member_id, split.amount, split.percentage],
      )
    }

    await client.query("COMMIT")

    // Fetch and return updated splits
    const result = await query(
      `SELECT es.*, tm.name as member_name
      FROM expense_splits es
      JOIN trip_members tm ON es.member_id = tm.id
      WHERE es.expense_id = $1`,
      [expenseId],
    )

    res.json(result.rows)
  } catch (error) {
    await client.query("ROLLBACK")
    console.error("Error configuring expense splits:", error)
    res.status(500).json({ error: "Internal server error" })
  } finally {
    client.release()
  }
})

// Get expense summary
router.get("/trips/:tripId/expenses/summary", async (req: Request, res: Response) => {
  const { tripId } = req.params

  try {
    // Total by category
    const categoryResult = await query(
      `SELECT category, SUM(amount_in_trip_currency) as total
      FROM expenses
      WHERE trip_id = $1
      GROUP BY category
      ORDER BY total DESC`,
      [tripId],
    )

    // Total by person
    const personResult = await query(
      `SELECT tm.id, tm.name, SUM(e.amount_in_trip_currency) as total_paid
      FROM expenses e
      JOIN trip_members tm ON e.paid_by = tm.id
      WHERE e.trip_id = $1
      GROUP BY tm.id, tm.name
      ORDER BY total_paid DESC`,
      [tripId],
    )

    // Overall total
    const totalResult = await query("SELECT SUM(amount_in_trip_currency) as total FROM expenses WHERE trip_id = $1", [
      tripId,
    ])

    res.json({
      by_category: categoryResult.rows,
      by_person: personResult.rows,
      total: totalResult.rows[0].total || 0,
    })
  } catch (error) {
    console.error("Error fetching expense summary:", error)
    res.status(500).json({ error: "Internal server error" })
  }
})

// Get settlements (who owes whom)
router.get("/trips/:tripId/settlements", async (req: Request, res: Response) => {
  const { tripId } = req.params

  try {
    // Calculate balances
    const balancesResult = await query(
      `SELECT 
        tm.id,
        tm.name,
        COALESCE(paid.total, 0) as total_paid,
        COALESCE(owed.total, 0) as total_owed,
        COALESCE(paid.total, 0) - COALESCE(owed.total, 0) as balance
      FROM trip_members tm
      LEFT JOIN (
        SELECT paid_by, SUM(amount_in_trip_currency) as total
        FROM expenses
        WHERE trip_id = $1
        GROUP BY paid_by
      ) paid ON tm.id = paid.paid_by
      LEFT JOIN (
        SELECT es.member_id, SUM(es.amount) as total
        FROM expense_splits es
        JOIN expenses e ON es.expense_id = e.id
        WHERE e.trip_id = $1
        GROUP BY es.member_id
      ) owed ON tm.id = owed.member_id
      WHERE tm.trip_id = $1
      ORDER BY balance DESC`,
      [tripId],
    )

    // Simple settlement calculation (not optimized)
    const balances = balancesResult.rows
    const settlements: { from: string; to: string; amount: string }[] = []

    const creditors = balances.filter((b) => parseFloat(b.balance) > 0)
    const debtors = balances.filter((b) => parseFloat(b.balance) < 0)

    for (const debtor of debtors) {
      let remaining = Math.abs(parseFloat(debtor.balance))

      for (const creditor of creditors) {
        if (remaining <= 0) break

        const creditorBalance = parseFloat(creditor.balance)
        if (creditorBalance <= 0) continue

        const amount = Math.min(remaining, creditorBalance)

        settlements.push({
          from: debtor.name,
          to: creditor.name,
          amount: amount.toFixed(2),
        })

        remaining -= amount
        creditor.balance = (creditorBalance - amount).toString()
      }
    }

    res.json({
      balances: balancesResult.rows,
      settlements,
    })
  } catch (error) {
    console.error("Error calculating settlements:", error)
    res.status(500).json({ error: "Internal server error" })
  }
})

export default router
