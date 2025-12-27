import { describe, it, expect } from "vitest"

import type { Activity, TransportAlternative } from "../../types"
import { calculateDayCost } from "../costUtils"

describe("calculateDayCost", () => {
  const mockActivities: Activity[] = [
    {
      id: "a1",
      name: "Activity 1",
      estimatedCost: 100,
      currency: "USD",
    } as any,
    {
      id: "a2",
      name: "Activity 2",
      actualCost: 50,
      currency: "EUR",
    } as any,
  ]

  const mockTransport: TransportAlternative[] = [
    {
      id: "t1",
      cost: 20,
      currency: "USD",
      isSelected: true,
    } as any,
    {
      id: "t2",
      cost: 30,
      currency: "GBP",
      isSelected: false, // Should be ignored
    } as any,
  ]

  const exchangeRates = {
    EUR: 1.1, // 1 EUR = 1.1 USD
    GBP: 1.3, // 1 GBP = 1.3 USD
  }

  it("calculates total cost correctly in base currency", () => {
    // Activity 1: 100 USD
    // Activity 2: 50 EUR * 1.1 = 55 USD
    // Transport 1: 20 USD
    // Total = 100 + 55 + 20 = 175 USD
    const result = calculateDayCost(mockActivities, mockTransport, exchangeRates, "USD")
    expect(result.total).toBe(175)
  })

  it("provides correct breakdown by currency", () => {
    const result = calculateDayCost(mockActivities, mockTransport, exchangeRates, "USD")

    expect(result.breakdown["USD"].total).toBe(120)
    expect(result.breakdown["USD"].convertedTotal).toBe(120)

    expect(result.breakdown["EUR"].total).toBe(50)
    expect(result.breakdown["EUR"].convertedTotal).toBeCloseTo(55, 5)

    expect(result.breakdown["GBP"]).toBeUndefined()
  })

  it("handles missing exchange rates by defaulting to 1", () => {
    const result = calculateDayCost(mockActivities, [], {}, "USD")
    // 100 USD + 50 EUR (rate 1) = 150
    expect(result.total).toBe(150)
  })

  it("ignores zero or negative costs", () => {
    const freeActivities: Activity[] = [{ id: "a1", estimatedCost: 0 } as any, { id: "a2", estimatedCost: -10 } as any]
    const result = calculateDayCost(freeActivities, [], {}, "USD")
    expect(result.total).toBe(0)
    expect(Object.keys(result.breakdown).length).toBe(0)
  })
})
