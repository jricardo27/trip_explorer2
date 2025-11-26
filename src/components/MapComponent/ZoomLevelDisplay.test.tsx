import { render, screen } from "@testing-library/react"
import { describe, it, expect, vi, beforeEach } from "vitest"

import ZoomLevelDisplay from "./ZoomLevelDisplay"

// Mock react-leaflet
const mockMapOn = vi.fn()
const mockMapOff = vi.fn()
const mockGetZoom = vi.fn(() => 10)

vi.mock("react-leaflet", () => ({
  useMap: () => ({
    getZoom: mockGetZoom,
    on: mockMapOn,
    off: mockMapOff,
  }),
}))

describe("ZoomLevelDisplay", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should render initial zoom level", () => {
    render(<ZoomLevelDisplay />)
    expect(screen.getByText("Zoom: 10")).toBeInTheDocument()
  })

  it("should register zoomend event listener", () => {
    render(<ZoomLevelDisplay />)
    expect(mockMapOn).toHaveBeenCalledWith("zoomend", expect.any(Function))
  })
})
