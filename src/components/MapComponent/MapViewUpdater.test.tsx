import { render } from "@testing-library/react"
import React from "react"
import { describe, it, expect, vi } from "vitest"

import MapViewUpdater from "./MapViewUpdater"

// Mock react-leaflet
const setViewMock = vi.fn()
vi.mock("react-leaflet", () => ({
  useMap: () => ({
    setView: setViewMock,
  }),
}))

describe("MapViewUpdater", () => {
  it("should update map view when center and zoom change", () => {
    render(<MapViewUpdater center={[10, 20]} zoom={12} />)
    expect(setViewMock).toHaveBeenCalledWith([10, 20], 12)
  })

  it("should not update map view if center is missing", () => {
    setViewMock.mockClear()
    // @ts-expect-error - Testing missing props
    render(<MapViewUpdater center={null} zoom={12} />)
    expect(setViewMock).not.toHaveBeenCalled()
  })
})
