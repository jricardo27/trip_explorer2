import { render } from "@testing-library/react"
import { describe, it, expect, vi, beforeEach } from "vitest"

import MapStateManager from "./MapStateManager"

// Mock react-leaflet
const mockGetCenter = vi.fn(() => ({ lat: 10, lng: 20 }))
const mockGetZoom = vi.fn(() => 12)
const mockUseMapEvent = vi.fn()
const mockMap = {
  getCenter: mockGetCenter,
  getZoom: mockGetZoom,
}

vi.mock("react-leaflet", () => ({
  useMap: () => mockMap,
  useMapEvent: (event: string, handler: () => void) => {
    mockUseMapEvent(event, handler)
  },
}))

describe("MapStateManager", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should register dragend and zoomend events", () => {
    render(<MapStateManager />)
    expect(mockUseMapEvent).toHaveBeenCalledWith("dragend", expect.any(Function))
    expect(mockUseMapEvent).toHaveBeenCalledWith("zoomend", expect.any(Function))
  })

  it("should save map state on event", () => {
    const setItemSpy = vi.spyOn(Storage.prototype, "setItem")
    const onMapMove = vi.fn()
    render(<MapStateManager onMapMove={onMapMove} />)

    const handler = mockUseMapEvent.mock.calls[0][1]
    handler()

    expect(mockGetCenter).toHaveBeenCalled()
    expect(mockGetZoom).toHaveBeenCalled()
    expect(onMapMove).toHaveBeenCalledWith([10, 20], 12)
    expect(setItemSpy).toHaveBeenCalledWith("mapState", JSON.stringify({ center: [10, 20], zoom: 12 }))
  })
})
