import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import React, { useContext } from "react"
import { vi, describe, it, expect, beforeEach } from "vitest"

import SavedFeaturesContext from "./SavedFeaturesContext"
import SavedFeaturesProvider from "./SavedFeaturesProvider"

// Mock fetch
global.fetch = vi.fn()

const TestComponent = () => {
  const context = useContext(SavedFeaturesContext)
  if (!context) return null

  const { savedFeatures, addFeature, removeFeature } = context

  return (
    <div>
      <div data-testid="features">{JSON.stringify(savedFeatures)}</div>
      <button onClick={() => addFeature("list1", { type: "Feature", properties: { id: "f1" }, geometry: { type: "Point", coordinates: [0, 0] } })}>
        Add Feature
      </button>
      <button onClick={() => removeFeature("list1", {
        feature: { type: "Feature", properties: { id: "f1" }, geometry: { type: "Point", coordinates: [0, 0] } },
        category: "list1",
        index: 0,
      })}
      >
        Remove Feature
      </button>
    </div>
  )
}

describe("SavedFeaturesProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  it("should load features from API on mount", async () => {
    const mockFeatures = { list1: [{ properties: { id: "f1" } }] }
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => mockFeatures,
    } as Response)

    render(
      <SavedFeaturesProvider>
        <TestComponent />
      </SavedFeaturesProvider>,
    )

    await waitFor(() => {
      expect(screen.getByTestId("features")).toHaveTextContent("list1")
    })
  })

  it("should add a feature", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({}),
    } as Response)

    render(
      <SavedFeaturesProvider>
        <TestComponent />
      </SavedFeaturesProvider>,
    )

    const user = userEvent.setup()
    await user.click(screen.getByText("Add Feature"))

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith("/api/features", expect.objectContaining({
        method: "POST",
      }))
    })
  })
})
