import { render, screen, fireEvent } from "@testing-library/react"
import React from "react"
import { describe, it, expect, vi } from "vitest"

import { FeatureDragContext } from "./FeatureDragContext"

// Mock dnd-kit
vi.mock("@dnd-kit/core", async () => {
  const actual = await vi.importActual("@dnd-kit/core")
  return {
    ...actual,
    DndContext: ({ children, onDragEnd }: { children: React.ReactNode; onDragEnd: (event: unknown) => void }) => (
      <div data-testid="dnd-context">
        <button
          data-testid="trigger-drag-end-reorder"
          onClick={() =>
            onDragEnd({
              active: { id: "f1" },
              over: { id: "f2" },
            })
          }
        >
          Drag End Reorder
        </button>
        <button
          data-testid="trigger-drag-end-move"
          onClick={() =>
            onDragEnd({
              active: { id: "f1" },
              over: { id: "list2", data: { current: { type: "tab" } } },
            })
          }
        >
          Drag End Move
        </button>
        {children}
      </div>
    ),
    DragOverlay: ({ children }: { children: React.ReactNode }) => <div data-testid="drag-overlay">{children}</div>,
    useSensor: vi.fn(),
    useSensors: vi.fn(),
  }
})

// Mock idxFeat to return consistent IDs
vi.mock("../../../utils/idxFeat", () => ({
  default: (index: number, feature: { properties: { id: string } }) => feature.properties.id || `f${index + 1}`,
}))

describe("FeatureDragContext", () => {
  const mockSetSavedFeatures = vi.fn()
  const defaultProps = {
    savedFeatures: {
      list1: [
        {
          type: "Feature" as const,
          properties: { id: "f1", name: "Feature 1" },
          geometry: { type: "Point" as const, coordinates: [0, 0] },
        },
        {
          type: "Feature" as const,
          properties: { id: "f2", name: "Feature 2" },
          geometry: { type: "Point" as const, coordinates: [1, 1] },
        },
      ],
      list2: [],
    },
    selectedTab: "list1",
    setSavedFeatures: mockSetSavedFeatures,
  }

  it("should render children", () => {
    render(
      <FeatureDragContext {...defaultProps}>
        <div data-testid="child">Child</div>
      </FeatureDragContext>,
    )
    expect(screen.getByTestId("child")).toBeInTheDocument()
  })

  it("should handle reordering within same list", () => {
    render(
      <FeatureDragContext {...defaultProps}>
        <div />
      </FeatureDragContext>,
    )

    fireEvent.click(screen.getByTestId("trigger-drag-end-reorder"))

    expect(mockSetSavedFeatures).toHaveBeenCalled()
    // We can't easily check the exact new state without more complex mocking or state inspection,
    // but we verify the setter is called.
  })

  it("should handle moving to another list", () => {
    render(
      <FeatureDragContext {...defaultProps}>
        <div />
      </FeatureDragContext>,
    )

    fireEvent.click(screen.getByTestId("trigger-drag-end-move"))

    expect(mockSetSavedFeatures).toHaveBeenCalled()
  })
})
