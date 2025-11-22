import { render } from "@testing-library/react"
import React from "react"
import { describe, it, expect, vi, beforeEach } from "vitest"

import MapEvents from "./MapEvents"

// Mock react-leaflet
const mockUseMapEvents = vi.fn()
vi.mock("react-leaflet", () => ({
  useMapEvents: (handlers: Record<string, (...args: unknown[]) => void>) => {
    mockUseMapEvents(handlers)
    return {}
  },
}))

describe("MapEvents", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should register map events", () => {
    const setOverlayVisibility = vi.fn()
    const setActiveBaseLayer = vi.fn()
    const contextMenuHandler = vi.fn()

    render(
      <MapEvents
        setOverlayVisibility={setOverlayVisibility}
        setActiveBaseLayer={setActiveBaseLayer}
        contextMenuHandler={contextMenuHandler}
      />,
    )

    expect(mockUseMapEvents).toHaveBeenCalledWith(expect.objectContaining({
      overlayadd: expect.any(Function),
      overlayremove: expect.any(Function),
      baselayerchange: expect.any(Function),
      contextmenu: contextMenuHandler,
    }))
  })

  it("should handle overlay add event", () => {
    const setOverlayVisibility = vi.fn()
    render(
      <MapEvents
        setOverlayVisibility={setOverlayVisibility}
        setActiveBaseLayer={vi.fn()}
      />,
    )

    const handlers = mockUseMapEvents.mock.calls[0][0]
    handlers.overlayadd({ name: "Layer 1" })

    expect(setOverlayVisibility).toHaveBeenCalled()
  })
})
