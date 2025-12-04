import express, { Request, Response } from "express"

import { query } from "../db"
import { authMiddleware } from "../middleware/auth"

const router = express.Router()

router.use(authMiddleware)

// Get currency rate
router.get("/rates/:from/:to", async (req: Request, res: Response) => {
  const { from, to } = req.params
  const { date = new Date().toISOString().split("T")[0] } = req.query

  try {
    const result = await query("SELECT get_currency_rate($1, $2, $3::DATE) as rate", [
      from.toUpperCase(),
      to.toUpperCase(),
      date,
    ])

    const rate = result.rows[0].rate

    if (rate === null) {
      return res.status(404).json({
        error: `No exchange rate found for ${from} to ${to} on or before ${date}`,
      })
    }

    res.json({
      from: from.toUpperCase(),
      to: to.toUpperCase(),
      rate,
      date,
    })
  } catch (error) {
    console.error("Error fetching currency rate:", error)
    res.status(500).json({ error: "Internal server error" })
  }
})

// Add or update currency rate
router.post("/rates", async (req: Request, res: Response) => {
  const { from_currency, to_currency, rate, effective_date, notes } = req.body

  if (!from_currency || !to_currency || !rate || !effective_date) {
    return res.status(400).json({
      error: "Missing required fields: from_currency, to_currency, rate, effective_date",
    })
  }

  try {
    const result = await query(
      `INSERT INTO currency_rates (from_currency, to_currency, rate, effective_date, notes, source)
      VALUES ($1, $2, $3, $4, $5, 'manual')
      ON CONFLICT (from_currency, to_currency, effective_date)
      DO UPDATE SET rate = $2, notes = $5, source = 'manual'
      RETURNING *`,
      [from_currency.toUpperCase(), to_currency.toUpperCase(), rate, effective_date, notes],
    )

    res.status(201).json(result.rows[0])
  } catch (error) {
    console.error("Error adding currency rate:", error)
    res.status(500).json({ error: "Internal server error" })
  }
})

// List all rates
router.get("/rates", async (req: Request, res: Response) => {
  const { from, to } = req.query

  try {
    let queryText = "SELECT * FROM currency_rates"
    const values: string[] = []
    const conditions: string[] = []

    if (from) {
      conditions.push(`from_currency = $${values.length + 1}`)
      values.push((from as string).toUpperCase())
    }

    if (to) {
      conditions.push(`to_currency = $${values.length + 1}`)
      values.push((to as string).toUpperCase())
    }

    if (conditions.length > 0) {
      queryText += " WHERE " + conditions.join(" AND ")
    }

    queryText += " ORDER BY effective_date DESC"

    const result = await query(queryText, values)
    res.json(result.rows)
  } catch (error) {
    console.error("Error listing currency rates:", error)
    res.status(500).json({ error: "Internal server error" })
  }
})

// Convert amount
router.post("/convert", async (req: Request, res: Response) => {
  const { amount, from, to, date = new Date().toISOString().split("T")[0] } = req.body

  if (!amount || !from || !to) {
    return res.status(400).json({
      error: "Missing required fields: amount, from, to",
    })
  }

  try {
    const result = await query("SELECT get_currency_rate($1, $2, $3::DATE) as rate", [
      from.toUpperCase(),
      to.toUpperCase(),
      date,
    ])

    const rate = result.rows[0].rate

    if (rate === null) {
      return res.status(404).json({
        error: `No exchange rate found for ${from} to ${to} on or before ${date}`,
      })
    }

    const convertedAmount = parseFloat(amount) * parseFloat(rate)

    res.json({
      original: {
        amount: parseFloat(amount),
        currency: from.toUpperCase(),
      },
      converted: {
        amount: convertedAmount,
        currency: to.toUpperCase(),
      },
      rate,
      date,
    })
  } catch (error) {
    console.error("Error converting currency:", error)
    res.status(500).json({ error: "Internal server error" })
  }
})

export default router
