import { render, screen } from "@testing-library/react"
import { describe, it, expect, vi } from "vitest"

import { ActivityCostFields } from "../ActivityForm/ActivityCostFields"

// Mock dependencies
vi.mock("../../stores/languageStore", () => ({
  useLanguageStore: () => ({
    t: (key: string) => key,
  }),
}))

describe("ActivityCostFields", () => {
  const defaultProps = {
    estimatedCost: "",
    setEstimatedCost: vi.fn(),
    actualCost: "",
    setActualCost: vi.fn(),
    currency: "AUD",
    setCurrency: vi.fn(),
    currencies: ["AUD", "USD"],
    isPaid: false,
    setIsPaid: vi.fn(),
    canEdit: true,
    splitType: "equal",
    setSplitType: vi.fn(),
    splits: [],
    setSplits: vi.fn(),
    paidById: "",
    setPaidById: vi.fn(),
    members: [],
    costOnceForLinkedGroup: false,
    setCostOnceForLinkedGroup: vi.fn(),
  }

  it("renders without crashing with default props", () => {
    render(<ActivityCostFields {...defaultProps} />)
    expect(screen.getByText("costs")).toBeInTheDocument()
  })

  it("handles null members and currencies gracefully", () => {
    const props = {
      ...defaultProps,
      members: null as any,
      currencies: null as any,
      splits: null as any,
      isPaid: true,
    }

    render(<ActivityCostFields {...props} />)
    expect(screen.getByText("costs")).toBeInTheDocument()
  })
})
