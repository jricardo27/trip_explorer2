import type { Activity, TransportAlternative } from "../types"

export interface CostBreakdown {
  [currency: string]: {
    total: number
    convertedTotal: number
  }
}

export interface DayCostResult {
  total: number
  breakdown: CostBreakdown
}

/**
 * Calculates the total cost for a set of activities and transport alternatives,
 * converting everything to the trip's base currency.
 */
export const calculateDayCost = (
  activities: Activity[],
  transport: TransportAlternative[],
  exchangeRates: Record<string, number> = {},
  baseCurrency: string = "USD",
): DayCostResult => {
  const breakdown: CostBreakdown = {}
  let totalConverted = 0

  // Helper to add to breakdown and total
  const addCost = (amount: number, currency: string = baseCurrency) => {
    if (amount <= 0) return

    const rate = currency === baseCurrency ? 1 : exchangeRates[currency] || 1
    const converted = amount * rate

    if (!breakdown[currency]) {
      breakdown[currency] = { total: 0, convertedTotal: 0 }
    }

    breakdown[currency].total += amount
    breakdown[currency].convertedTotal += converted
    totalConverted += converted
  }

  // Process activities
  activities.forEach((activity) => {
    const hasActual = activity.actualCost !== null && activity.actualCost !== undefined
    const amount = hasActual ? Number(activity.actualCost) : Number(activity.estimatedCost) || 0
    addCost(amount, activity.currency || baseCurrency)
  })

  // Process selected transport
  transport.forEach((t) => {
    if (t.isSelected) {
      addCost(Number(t.cost) || 0, t.currency || baseCurrency)
    }
  })

  return {
    total: totalConverted,
    breakdown,
  }
}
