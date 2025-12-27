import type { Activity, Expense, TransportAlternative, Trip } from "../types"

export interface CostAggregates {
  totalBudget: number
  totalPlanned: number
  totalActual: number
  totalExpected: number
  currency: string
}

export interface CurrencyBreakdown {
  [currency: string]: {
    total: number
    convertedTotal: number
  }
}

export class CostController {
  private trip: Trip
  private exchangeRates: Record<string, number>
  private baseCurrency: string

  constructor(trip: Trip) {
    this.trip = trip
    this.baseCurrency = trip.defaultCurrency || "USD"
    this.exchangeRates = trip.exchangeRates || {}
  }

  private convertToBox(amount: number, currency: string): number {
    if (currency === this.baseCurrency) return amount
    const rate = this.exchangeRates[currency] || 1
    return amount * rate
  }

  getAggregates(overrides?: {
    activities?: Activity[]
    expenses?: Expense[]
    transport?: TransportAlternative[]
  }): CostAggregates {
    const activities = overrides?.activities || this.trip.activities || []
    const transport = overrides?.transport || this.trip.transport || []
    const expenses = overrides?.expenses || this.trip.expenses || []

    let totalPlanned = 0
    let totalActual = 0

    // Maps to track which items have recorded expenses
    const expenseActivityIds = new Set(expenses.map((e) => e.activityId).filter(Boolean))
    const expenseTransportIds = new Set(expenses.map((e) => e.transportAlternativeId).filter(Boolean))

    // 1. All actual Expenses are the primary source of 'spent' data
    const selectedTransportIds = new Set(transport.filter((t) => t.isSelected).map((t) => t.id))

    expenses.forEach((expense) => {
      // If linked to a transport, only count if that transport is selected
      if (expense.transportAlternativeId && !selectedTransportIds.has(expense.transportAlternativeId)) {
        return
      }
      const rate = expense.currency === this.baseCurrency ? 1 : this.exchangeRates[expense.currency || ""] || 1
      totalActual += (Number(expense.amount) || 0) * rate
    })

    // 2. Activities
    const seenLinkedGroupsAgg = new Set<string>()
    activities.forEach((activity) => {
      const rate = activity.currency === this.baseCurrency ? 1 : this.exchangeRates[activity.currency || ""] || 1

      // Planned: sum of all estimated costs
      // Even for linked groups, we might plan them all or just one.
      // Usually planning includes all instances to see the "full capacity" if they were separate.
      // But if costOnceForLinkedGroup is true, planning should also probably reflect only one cost.
      let plannedAmount = (Number(activity.estimatedCost) || 0) * rate

      if (activity.linkedGroupId && activity.costOnceForLinkedGroup) {
        if (seenLinkedGroupsAgg.has(activity.linkedGroupId)) {
          plannedAmount = 0
        }
      }
      totalPlanned += plannedAmount

      // Actual: sum of actual costs ONLY if no real Expense records are linked
      if (!expenseActivityIds.has(activity.id)) {
        if (activity.actualCost !== null && activity.actualCost !== undefined) {
          let actualAmount = Number(activity.actualCost) * rate
          if (activity.linkedGroupId && activity.costOnceForLinkedGroup) {
            if (seenLinkedGroupsAgg.has(activity.linkedGroupId)) {
              actualAmount = 0
            }
          }
          totalActual += actualAmount
        }
      }

      if (activity.linkedGroupId && activity.costOnceForLinkedGroup) {
        seenLinkedGroupsAgg.add(activity.linkedGroupId)
      }
    })

    // 3. Transport Alternatives
    transport.forEach((t) => {
      if (t.isSelected) {
        const rate = t.currency === this.baseCurrency ? 1 : this.exchangeRates[t.currency || ""] || 1
        totalPlanned += (Number(t.cost) || 0) * rate

        // Actual: selected transport cost ONLY if no real Expense records are linked
        if (!expenseTransportIds.has(t.id)) {
          totalActual += (Number(t.cost) || 0) * rate
        }
      }
    })

    // 4. totalExpected = what we expect to spend by the end of the trip
    let totalExpected = 0

    // Add all expenses (standalone and linked to selected items)
    expenses.forEach((e) => {
      if (e.transportAlternativeId && !selectedTransportIds.has(e.transportAlternativeId)) {
        return
      }
      const rate = e.currency === this.baseCurrency ? 1 : this.exchangeRates[e.currency || ""] || 1
      totalExpected += (Number(e.amount) || 0) * rate
    })

    // For activities: if it has an actualCost, use it (if no expenses).
    // If it has expenses, we already added them. We might need to check if expenses < actualCost?
    // Let's simplify: Expected for an activity = max(actualCost, sum(expenses), OR estimatedCost if neither)
    const seenLinkedGroupsExp = new Set<string>()
    activities.forEach((a) => {
      const rate = a.currency === this.baseCurrency ? 1 : this.exchangeRates[a.currency || ""] || 1

      let amountToSum = 0
      // If we have expenses for this activity, they are already in totalExpected.
      // We only add the "remaining" or the "estimates" if nothing is spent.
      if (!expenseActivityIds.has(a.id)) {
        if (a.actualCost !== null && a.actualCost !== undefined) {
          amountToSum = Number(a.actualCost) * rate
        } else {
          amountToSum = (Number(a.estimatedCost) || 0) * rate
        }
      }

      if (a.linkedGroupId && a.costOnceForLinkedGroup) {
        if (seenLinkedGroupsExp.has(a.linkedGroupId)) {
          amountToSum = 0
        }
        seenLinkedGroupsExp.add(a.linkedGroupId)
      }

      totalExpected += amountToSum
    })

    // For transport:
    transport.forEach((t) => {
      if (t.isSelected && !expenseTransportIds.has(t.id)) {
        const rate = t.currency === this.baseCurrency ? 1 : this.exchangeRates[t.currency || ""] || 1
        totalExpected += (Number(t.cost) || 0) * rate
      }
    })

    return {
      totalBudget: Number(this.trip.budget) || 0,
      totalPlanned,
      totalActual,
      totalExpected,
      currency: this.baseCurrency,
    }
  }

  getBreakdownByCategory(overrides?: {
    activities?: Activity[]
    expenses?: Expense[]
    transport?: TransportAlternative[]
  }): { [category: string]: { planned: number; actual: number } } {
    const activities = overrides?.activities || this.trip.activities || []
    const transport = overrides?.transport || this.trip.transport || []
    const expenses = overrides?.expenses || this.trip.expenses || []

    const breakdown: { [category: string]: { planned: number; actual: number } } = {}

    const add = (cat: string, type: "planned" | "actual", amount: number, currency: string) => {
      const category = cat || "Other"
      if (!breakdown[category]) breakdown[category] = { planned: 0, actual: 0 }
      breakdown[category][type] += this.convertToBox(amount, currency)
    }

    const seenLinkedGroupsBreakdown = new Set<string>()
    activities.forEach((a) => {
      const isDuplicate = a.linkedGroupId && a.costOnceForLinkedGroup && seenLinkedGroupsBreakdown.has(a.linkedGroupId)

      if (!isDuplicate) {
        add(a.activityType || "Other", "planned", Number(a.estimatedCost) || 0, a.currency || this.baseCurrency)
        if (a.actualCost !== null && a.actualCost !== undefined) {
          add(a.activityType || "Other", "actual", Number(a.actualCost), a.currency || this.baseCurrency)
        }
      }

      if (a.linkedGroupId && a.costOnceForLinkedGroup) {
        seenLinkedGroupsBreakdown.add(a.linkedGroupId)
      }
    })

    transport.forEach((t) => {
      if (t.isSelected) {
        add("Transport", "planned", Number(t.cost) || 0, t.currency || this.baseCurrency)
        add("Transport", "actual", Number(t.cost) || 0, t.currency || this.baseCurrency)
      }
    })

    expenses.forEach((e) => {
      if (!e.activityId) {
        add(e.category, "actual", Number(e.amount) || 0, e.currency || this.baseCurrency)
      }
    })

    return breakdown
  }
}
