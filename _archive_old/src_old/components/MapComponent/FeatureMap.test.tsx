import { render, screen } from "@testing-library/react"
import React from "react"
import { describe, it, expect, vi } from "vitest"

import SavedFeaturesContext from "../../contexts/SavedFeaturesContext"

import { FeatureMap } from "./FeatureMap"

// Mock sub-components
vi.mock("../../components/MapComponent/MapComponent", () => ({
  default: ({ children }: { children?: React.ReactNode }) => <div data-testid="map-component">{children}</div>,
}))
vi.mock("../../components/SavedFeaturesDrawer/SavedFeaturesDrawer", () => ({
  default: () => <div data-testid="saved-features-drawer" />,
}))
vi.mock("../StyledGeoJson/StyledGeoJson", () => ({
  default: () => <div data-testid="styled-geojson" />,
}))
vi.mock("./FeatureMapContextMenu", () => ({
  default: () => <div data-testid="feature-map-context-menu" />,
}))
vi.mock("./TripRouteLayer", () => ({
  default: () => <div data-testid="trip-route-layer" />,
}))

// Mock hooks
const mockOverlayMarkers = {
  loading: false,
  error: null,
  "file1.json": { type: "FeatureCollection", features: [] },
}

vi.mock("../../hooks/useGeoJsonMarkers", () => ({
  default: () => mockOverlayMarkers,
}))

vi.mock("../../contexts/TripContext", () => ({
  useTripContext: () => ({
    trips: [],
    currentTrip: null,
  }),
}))

const mockContextValue = {
  savedFeatures: {
    all: [],
  },
  setSavedFeatures: vi.fn(),
  addFeature: vi.fn(),
  removeFeature: vi.fn(),
  updateFeature: vi.fn(),
  saveToLocalStorage: vi.fn(),
  loadFromLocalStorage: vi.fn(),
  userId: "test-user",
  setUserId: vi.fn(),
  email: "test@example.com",
  login: vi.fn(),
  logout: vi.fn(),
}

describe("FeatureMap", () => {
  const defaultProps = {
    geoJsonOverlaySources: { "file1.json": {} },
    drawerOpen: false,
    closeDrawer: vi.fn(),
    center: [0, 0] as [number, number],
  }

  it("should render map and drawer", () => {
    render(
      <SavedFeaturesContext.Provider value={mockContextValue}>
        <FeatureMap {...defaultProps} />
      </SavedFeaturesContext.Provider>,
    )
    expect(screen.getByTestId("map-component")).toBeInTheDocument()
    expect(screen.getByTestId("saved-features-drawer")).toBeInTheDocument()
  })
})
