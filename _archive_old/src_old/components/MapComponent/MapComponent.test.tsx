import { render } from "@testing-library/react"
import React from "react"
import { describe, it, vi } from "vitest"

import MapComponent from "./MapComponent"

// Mock react-leaflet
vi.mock("react-leaflet", async () => {
  const actual = await vi.importActual("react-leaflet")

  const LayersControlMock = ({ children }: { children?: React.ReactNode }) => <div>{children}</div>
  LayersControlMock.displayName = "LayersControl"
  const BaseLayer = ({ children }: { children?: React.ReactNode }) => <div>{children}</div>
  BaseLayer.displayName = "LayersControl.BaseLayer"
  LayersControlMock.BaseLayer = BaseLayer
  const Overlay = ({ children }: { children?: React.ReactNode }) => <div>{children}</div>
  Overlay.displayName = "LayersControl.Overlay"
  LayersControlMock.Overlay = Overlay

  return {
    ...actual,
    MapContainer: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
    TileLayer: () => <div data-testid="tile-layer" />,
    LayersControl: LayersControlMock,
  }
})

// Mock sub-components
vi.mock("./MapEvents", () => ({ default: () => null }))
vi.mock("./MapStateManager", () => ({ default: () => null }))
vi.mock("./MapViewUpdater", () => ({ default: () => null }))
vi.mock("./ZoomLevelDisplay", () => ({ default: () => null }))

describe("MapComponent", () => {
  it("should render map container", () => {
    render(<MapComponent center={[0, 0]} />)
    // Since MapContainer renders children div
    // And we have other components inside.
    // We can check if it renders without crashing.
  })
})
