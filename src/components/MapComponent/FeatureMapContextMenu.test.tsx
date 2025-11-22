import { render, screen } from "@testing-library/react"
import React from "react"
import { describe, it, expect, vi } from "vitest"

import SavedFeaturesContext from "../../contexts/SavedFeaturesContext"

import FeatureMapContextMenu from "./FeatureMapContextMenu"

// Mock MapContextMenu
vi.mock("../../components/MapComponent/MapContextMenu", () => ({
  default: ({ children }: { children: React.ReactNode }) => <div data-testid="map-context-menu">{children}</div>,
}))

// Mock MenuOption
vi.mock("../../components/ContextMenu/MenuOption", () => ({
  default: ({ title }: { title: string }) => <div data-testid="menu-option">{title}</div>,
}))

const mockContextValue = {
  savedFeatures: { all: [] },
  setSavedFeatures: vi.fn(),
  addFeature: vi.fn(),
  removeFeature: vi.fn(),
  updateFeature: vi.fn(),
  saveToLocalStorage: vi.fn(),
  loadFromLocalStorage: vi.fn(),
}

describe("FeatureMapContextMenu", () => {
  it("should render nothing if menuLatLng is missing", () => {
    render(
      <SavedFeaturesContext.Provider value={mockContextValue}>
        <FeatureMapContextMenu />
      </SavedFeaturesContext.Provider>,
    )
    expect(screen.queryByTestId("map-context-menu")).not.toBeInTheDocument()
  })

  it("should render menu options when menuLatLng is provided", () => {
    const latlng = { lat: 10, lng: 20 } as unknown as L.LatLng
    render(
      <SavedFeaturesContext.Provider value={mockContextValue}>
        <FeatureMapContextMenu menuLatLng={latlng} />
      </SavedFeaturesContext.Provider>,
    )
    expect(screen.getByTestId("map-context-menu")).toBeInTheDocument()
    expect(screen.getByText("Copy feature to clipboard")).toBeInTheDocument()
    expect(screen.getByText("Save feature to list")).toBeInTheDocument()
  })
})
