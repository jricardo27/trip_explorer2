import { render, screen, fireEvent } from "@testing-library/react"
import React from "react"
import { describe, it, expect, vi } from "vitest"

import SavedFeaturesContext from "../../contexts/SavedFeaturesContext"

import SavedFeaturesDrawer from "./SavedFeaturesDrawer"

// Mock sub-components
vi.mock("./TabList/TabList", () => ({
  TabList: ({
    tabs,
    handleTabChange,
  }: {
    tabs: string[]
    handleTabChange: (e: React.SyntheticEvent, tab: string) => void
  }) => (
    <div>
      {tabs.map((tab: string) => (
        <button key={tab} onClick={(e) => handleTabChange(e, tab)}>
          {tab}
        </button>
      ))}
    </div>
  ),
}))

vi.mock("./FeatureList/FeatureList", () => ({
  FeatureList: ({ items }: { items: Array<{ feature: { properties: { name: string } }; originalIndex: number }> }) => (
    <ul>
      {items.map((item) => (
        <li key={item.originalIndex}>{item.feature.properties.name}</li>
      ))}
    </ul>
  ),
}))

vi.mock("./ContextMenu/CategoryContextMenu", () => ({
  CategoryContextMenu: () => <div data-testid="category-context-menu" />,
}))

vi.mock("./ContextMenu/FeatureContextMenu", () => ({
  FeatureContextMenu: () => <div data-testid="feature-context-menu" />,
}))

vi.mock("./FeatureList/FeatureDragContext", () => ({
  FeatureDragContext: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

vi.mock("../Auth/AuthModal", () => ({
  AuthModal: () => <div data-testid="auth-modal" />,
}))

const mockContextValue = {
  savedFeatures: {
    all: [
      {
        type: "Feature" as const,
        properties: { name: "Feature 1" },
        geometry: { type: "Point" as const, coordinates: [0, 0] },
      },
      {
        type: "Feature" as const,
        properties: { name: "Feature 2" },
        geometry: { type: "Point" as const, coordinates: [1, 1] },
      },
    ],
    list1: [
      {
        type: "Feature" as const,
        properties: { name: "Feature 1" },
        geometry: { type: "Point" as const, coordinates: [0, 0] },
      },
    ],
  },
  setSavedFeatures: vi.fn(),
  addFeature: vi.fn(),
  removeFeature: vi.fn(),
  updateFeature: vi.fn(),
  saveToLocalStorage: vi.fn(),
  loadFromLocalStorage: vi.fn(),
  userId: "test-user-id",
  setUserId: vi.fn(),
  email: null,
  login: vi.fn(),
  logout: vi.fn(),
}

describe("SavedFeaturesDrawer", () => {
  it("should render drawer content when open", () => {
    render(
      <SavedFeaturesContext.Provider value={mockContextValue}>
        <SavedFeaturesDrawer
          drawerOpen={true}
          onClose={vi.fn()}
          isPinned={false}
          onTogglePin={vi.fn()}
          onFlyTo={vi.fn()}
        />
      </SavedFeaturesContext.Provider>,
    )
    expect(screen.getByText("all")).toBeInTheDocument()
    expect(screen.getByText("list1")).toBeInTheDocument()
    expect(screen.getByText("Feature 1")).toBeInTheDocument()
    expect(screen.getByText("test-user-id")).toBeInTheDocument()
  })

  it("should filter features based on search", () => {
    render(
      <SavedFeaturesContext.Provider value={mockContextValue}>
        <SavedFeaturesDrawer
          drawerOpen={true}
          onClose={vi.fn()}
          isPinned={false}
          onTogglePin={vi.fn()}
          onFlyTo={vi.fn()}
        />
      </SavedFeaturesContext.Provider>,
    )

    const searchInput = screen.getByLabelText("Search Features")
    fireEvent.change(searchInput, { target: { value: "Feature 2" } })

    expect(screen.getByText("Feature 2")).toBeInTheDocument()
    expect(screen.queryByText("Feature 1")).not.toBeInTheDocument()
  })

  it("should switch tabs", () => {
    render(
      <SavedFeaturesContext.Provider value={mockContextValue}>
        <SavedFeaturesDrawer
          drawerOpen={true}
          onClose={vi.fn()}
          isPinned={false}
          onTogglePin={vi.fn()}
          onFlyTo={vi.fn()}
        />
      </SavedFeaturesContext.Provider>,
    )

    fireEvent.click(screen.getByText("list1"))
    // list1 only has Feature 1
    expect(screen.getByText("Feature 1")).toBeInTheDocument()
    expect(screen.queryByText("Feature 2")).not.toBeInTheDocument()
  })

  it("should allow updating user ID", () => {
    render(
      <SavedFeaturesContext.Provider value={mockContextValue}>
        <SavedFeaturesDrawer
          drawerOpen={true}
          onClose={vi.fn()}
          isPinned={false}
          onTogglePin={vi.fn()}
          onFlyTo={vi.fn()}
        />
      </SavedFeaturesContext.Provider>,
    )

    const input = screen.getByLabelText("Enter ID to Sync")
    fireEvent.change(input, { target: { value: "new-id" } })

    const syncButton = screen.getByText("Sync")
    fireEvent.click(syncButton)

    expect(mockContextValue.setUserId).toHaveBeenCalledWith("new-id")
  })
})
