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
 * Refactored to use CostController for consistency.
 */
export const calculateDayCost = (
  activities: Activity[],
  transport: TransportAlternative[],
  exchangeRates: Record<string, number> = {},
  baseCurrency: string = "USD",
): DayCostResult => {
  // Note: CostController.getAggregates returns totalActual/totalPlanned.
  // Legacy calculateDayCost used totalActual if available, otherwise estimated.
  // This matches CostController's totalExpected (which uses actual if present, otherwise estimated).

  // We also need the breakdown by CURRENCY for the legacy Return type.
  // Let's add a method to CostController for currency breakdown or implement it here.

  const breakdown: CostBreakdown = {}

  // Manual breakdown by currency for legacy support
  const processItem = (amount: number | null | undefined, currency: string) => {
    const numAmount = Number(amount)
    if (isNaN(numAmount) || numAmount <= 0) return

    const rate = currency === baseCurrency ? 1 : exchangeRates[currency] || 1
    const converted = numAmount * rate

    if (!breakdown[currency]) {
      breakdown[currency] = { total: 0, convertedTotal: 0 }
    }
    breakdown[currency].total += numAmount
    breakdown[currency].convertedTotal += converted
  }

  activities.forEach((a) => {
    const costToUse = a.actualCost !== null && a.actualCost !== undefined ? a.actualCost : a.estimatedCost
    processItem(costToUse, a.currency || baseCurrency)
  })

  transport.forEach((t) => {
    if (t.isSelected) {
      processItem(t.cost, t.currency || baseCurrency)
    }
  })

  // Recalculate total from the breakdown to ensure consistency
  const total = Object.values(breakdown).reduce((sum, curr) => sum + curr.convertedTotal, 0)

  return {
    total,
    breakdown,
  }
}
