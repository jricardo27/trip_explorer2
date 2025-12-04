import { render, screen, act } from "@testing-library/react"
import React from "react"
import { describe, it, expect, vi, beforeEach } from "vitest"

import MapContextMenu from "./MapContextMenu"

// Mock react-leaflet
const mockLatLngToContainerPoint = vi.fn(() => ({ x: 100, y: 200 }))
const mockUseMapEvents = vi.fn()

const mockMap = {
  latLngToContainerPoint: mockLatLngToContainerPoint,
}

vi.mock("react-leaflet", () => ({
  useMapEvents: (handlers: Record<string, (...args: unknown[]) => void>) => {
    mockUseMapEvents(handlers)
    return mockMap
  },
}))

// Mock ContextMenu
vi.mock("../ContextMenu/ContextMenu", () => ({
  default: ({ children }: { children: React.ReactNode }) => <div data-testid="context-menu">{children}</div>,
}))

describe("MapContextMenu", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should render nothing initially", () => {
    render(<MapContextMenu>Option</MapContextMenu>)
    expect(screen.queryByTestId("context-menu")).not.toBeInTheDocument()
  })

  it("should render context menu on contextmenu event", () => {
    render(<MapContextMenu>Option</MapContextMenu>)

    const handlers = mockUseMapEvents.mock.calls[0][0]
    act(() => {
      handlers.contextmenu({
        originalEvent: { preventDefault: vi.fn() },
        latlng: { lat: 10, lng: 20 },
      })
    })

    expect(screen.getByTestId("context-menu")).toBeInTheDocument()
  })
})
