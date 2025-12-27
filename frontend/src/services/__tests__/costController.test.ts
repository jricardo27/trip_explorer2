import { CostController } from "../costController"

describe("CostController", () => {
  const mockTrip: any = {
    id: "1",
    name: "Test Trip",
    startDate: new Date().toISOString(),
    endDate: new Date().toISOString(),
    budget: 1000,
    defaultCurrency: "USD",
    currencies: ["USD", "EUR"],
    exchangeRates: { EUR: 1.1 },
    activities: [
      {
        id: "a1",
        name: "Ac 1",
        activityType: "ACCOMMODATION",
        estimatedCost: 100,
        currency: "USD",
        status: "PLANNED",
        orderIndex: 0,
        tripId: "1",
      },
      {
        id: "a2",
        name: "Ac 2",
        activityType: "RESTAURANT",
        estimatedCost: 50,
        actualCost: 60,
        currency: "EUR",
        status: "COMPLETED",
        orderIndex: 1,
        tripId: "1",
      },
    ],
    transport: [
      {
        id: "t1",
        transportMode: "DRIVING",
        cost: 20,
        currency: "USD",
        isSelected: true,
        tripId: "1",
        fromActivityId: "a1",
        toActivityId: "a2",
        name: "Drive",
        durationMinutes: 30,
        bufferMinutes: 5,
        costPerPerson: 20,
      },
    ],
    expenses: [
      {
        id: "e1",
        description: "Snack",
        category: "Food",
        amount: 10,
        currency: "USD",
        tripId: "1",
        createdAt: new Date().toISOString(),
        isPaid: true,
        splitType: "EQUAL",
        updatedAt: new Date().toISOString(),
      },
    ],
  }

  it("calculates aggregates correctly with multi-currency", () => {
    const controller = new CostController(mockTrip)
    const aggregates = controller.getAggregates()

    // Planned:
    // a1: 100 USD -> 100
    // a2: 50 EUR -> 50 * 1.1 = 55
    // t1: 20 USD -> 20
    // Total Planned: 175
    expect(aggregates.totalPlanned).toBe(175)

    // Actual:
    // a1: null -> 0
    // a2: 60 EUR -> 60 * 1.1 = 66
    // t1: 20 USD -> 20
    // e1: 10 USD -> 10
    // Total Actual: 96
    expect(aggregates.totalActual).toBe(96)

    // Expected:
    // a1: (estimated) 100 USD -> 100
    // a2: (actual) 66
    // t1: 20
    // e1: 10
    // Total Expected: 196
    expect(aggregates.totalExpected).toBe(196)
  })

  it("handles missing exchange rates by falling back to 1", () => {
    const tripNoRates = { ...mockTrip, exchangeRates: {} }
    const controller = new CostController(tripNoRates)
    const aggregates = controller.getAggregates()

    // Planned: 100 (USD) + 50 (EUR -> 1) + 20 (USD) = 170
    expect(aggregates.totalPlanned).toBe(170)
  })

  it("avoids double counting when both activity actualCost and expenses exist", () => {
    const tripWithDouble: any = {
      ...mockTrip,
      expenses: [
        {
          id: "e1",
          amount: 10,
          currency: "USD",
          activityId: "a2", // Linked to a2 which has actualCost=60
        },
      ],
    }
    const controller = new CostController(tripWithDouble)
    const aggregates = controller.getAggregates()

    // Expenses: e1 (10) -> 10
    // activities: a1 (0), a2 (linked to e1, so actualCost 60 is IGNORED in favor of expense)
    // transport: t1 (20)
    // Total Actual: 10 + 20 = 30
    expect(aggregates.totalActual).toBe(30)
  })

  it("filters out expenses linked to non-selected transport", () => {
    const tripWithDeselected: any = {
      ...mockTrip,
      transport: [
        {
          id: "t1",
          cost: 20,
          currency: "USD",
          isSelected: false, // NOT SELECTED
        },
      ],
      expenses: [
        {
          id: "e1",
          amount: 10,
          currency: "USD",
          transportAlternativeId: "t1", // Linked to deselected t1
        },
      ],
    }
    const controller = new CostController(tripWithDeselected)
    const aggregates = controller.getAggregates()

    // Expenses: e1 is linked to deselected t1 -> IGNORED
    // activities: a1 (0), a2 (66)
    // transport: t1 (deselected) -> 0
    // Total Actual: 66
    expect(aggregates.totalActual).toBe(66)
  })

  it("respects costOnceForLinkedGroup by counting cost only once per group", () => {
    const tripWithLinked: any = {
      ...mockTrip,
      exchangeRates: { EUR: 1.1 },
      activities: [
        {
          id: "la1",
          name: "Linked 1",
          estimatedCost: 100,
          currency: "USD",
          linkedGroupId: "g1",
          costOnceForLinkedGroup: true,
        },
        {
          id: "la2",
          name: "Linked 2", // Should be ignored
          estimatedCost: 100,
          currency: "USD",
          linkedGroupId: "g1",
          costOnceForLinkedGroup: true,
        },
      ],
      expenses: [],
      transport: [],
    }

    const controller = new CostController(tripWithLinked)
    const aggregates = controller.getAggregates()

    // Total should be 100, not 200
    expect(aggregates.totalPlanned).toBe(100)
  })

  it("filters activities based on selected scenarios", () => {
    const tripWithScenarios: any = {
      ...mockTrip,
      days: [
        {
          id: "d1",
          scenarios: [
            { id: "s1", isSelected: true },
            { id: "s2", isSelected: false },
          ],
        },
      ],
      activities: [
        {
          id: "sa1",
          estimatedCost: 100,
          currency: "USD",
          scenarioId: "s1", // Selected
        },
        {
          id: "sa2",
          estimatedCost: 50, // Should be ignored
          currency: "USD",
          scenarioId: "s2", // Not selected
        },
        {
          id: "sa3",
          estimatedCost: 20,
          currency: "USD",
          // No scenario -> always included
        },
      ],
      expenses: [],
      transport: [],
    }

    const controller = new CostController(tripWithScenarios)
    const aggregates = controller.getAggregates()

    // 100 (s1) + 20 (no scenario) = 120
    expect(aggregates.totalPlanned).toBe(120)
  })
})
