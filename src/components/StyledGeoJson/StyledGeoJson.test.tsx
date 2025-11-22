import { render } from "@testing-library/react"
import React from "react"
import { GeoJSON } from "react-leaflet"
import { describe, it, expect, vi } from "vitest"

import StyledGeoJson from "./StyledGeoJson"

// Mock react-leaflet
vi.mock("react-leaflet", () => ({
  GeoJSON: vi.fn(() => null),
}))

// Mock leaflet
vi.mock("leaflet", () => ({
  default: {
    marker: vi.fn(),
    divIcon: vi.fn(),
    DomUtil: {
      create: vi.fn(() => document.createElement("div")),
    },
  },
}))

describe("StyledGeoJson", () => {
  it("should render GeoJSON component", () => {
    const data = { type: "FeatureCollection", features: [] }
    // @ts-expect-error - Test mock types
    render(<StyledGeoJson data={data} />)

    // Verify GeoJSON was called (rendered)
    expect(GeoJSON).toHaveBeenCalled()
  })
})
