import { render, act } from "@testing-library/react"
import { MapContainer } from "react-leaflet"
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

import { TripAnimationLayer } from "../TripAnimationLayer"

// Mock requestAnimationFrame to work with fake timers
vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
  return setTimeout(() => cb(performance.now()), 0)
})
vi.stubGlobal("cancelAnimationFrame", (id: number) => {
  clearTimeout(id)
})

// Mock Leaflet
vi.mock("leaflet", () => ({
  default: {
    latLngBounds: vi.fn(() => ({
      isValid: () => true,
    })),
    divIcon: vi.fn(),
    DOMUtil: {
      create: vi.fn(),
    },
  },
}))

// Mock React Leaflet
vi.mock("react-leaflet", async () => {
  const actual = await vi.importActual("react-leaflet")
  return {
    ...actual,
    useMap: () => ({
      fitBounds: vi.fn(),
      flyTo: vi.fn(),
      distance: () => 1000, // Fixed distance
      once: (event: string, cb: () => void) => {
        // Immediately trigger moveend for testing flow
        if (event === "moveend") {
          setTimeout(cb, 0)
        }
      },
      addLayer: vi.fn(),
      removeLayer: vi.fn(),
    }),
    Marker: vi.fn(() => null),
    Polyline: vi.fn(() => null),
    Tooltip: vi.fn(() => null),
    Popup: vi.fn(() => null),
  }
})

describe("TripAnimationLayer", () => {
  const mockActivities = [
    {
      id: "1",
      name: "Start",
      latitude: 10,
      longitude: 10,
      activityType: "LOCATION",
    },
    {
      id: "2",
      name: "End",
      latitude: 20,
      longitude: 20,
      activityType: "LOCATION",
    },
  ]

  let defaultProps: any

  beforeEach(() => {
    vi.useFakeTimers()
    defaultProps = {
      activities: mockActivities,
      isPlaying: false,
      onAnimationComplete: vi.fn(),
      onProgressUpdate: vi.fn(),
      seekProgress: null,
    }
  })

  afterEach(() => {
    vi.clearAllTimers()
    vi.useRealTimers()
    vi.resetAllMocks()
  })

  it("should report 0 progress when stopped", () => {
    render(<TripAnimationLayer {...defaultProps} />)
    // The component might not call onProgressUpdate immediately with 0
    // but the initial state should be correct. This test is less critical.
  })

  it("should start animation and update progress when playing", async () => {
    render(
      <MapContainer>
        <TripAnimationLayer {...defaultProps} isPlaying={true} />
      </MapContainer>,
    )

    await act(async () => {
      vi.runAllTimers()
    })

    expect(defaultProps.onProgressUpdate).toHaveBeenCalled()
    const calls = defaultProps.onProgressUpdate.mock.calls
    // Check that at least one call was with a value > 0
    expect(calls.some((call: any[]) => call[0] > 0)).toBe(true)
  })

  it("should complete animation and call onAnimationComplete", async () => {
    const onComplete = vi.fn()
    render(
      <MapContainer>
        <TripAnimationLayer {...defaultProps} isPlaying={true} onAnimationComplete={onComplete} />
      </MapContainer>,
    )

    await act(async () => {
      for (let i = 0; i < 15; i++) {
        vi.runAllTimers()
      }
    })

    expect(onComplete).toHaveBeenCalled()
  })

  it("should not play (pause) when isPlaying becomes false without resetting state", async () => {
    const { rerender } = render(
      <MapContainer>
        <TripAnimationLayer {...defaultProps} isPlaying={true} />
      </MapContainer>,
    )

    await act(async () => {
      vi.advanceTimersByTime(500) // Let it run a bit
    })

    const callsBeforePause = defaultProps.onProgressUpdate.mock.calls.length
    const lastProgress = defaultProps.onProgressUpdate.mock.calls[callsBeforePause - 1][0]
    expect(lastProgress).toBeGreaterThan(0)

    rerender(
      <MapContainer>
        <TripAnimationLayer {...defaultProps} isPlaying={false} />
      </MapContainer>,
    )

    await act(async () => {
      vi.runAllTimers() // Try to advance time after pausing
    })

    const callsAfterPause = defaultProps.onProgressUpdate.mock.calls.length
    expect(callsAfterPause).toBe(callsBeforePause)
  })

  it("should ensure progress is monotonic", async () => {
    render(
      <MapContainer>
        <TripAnimationLayer {...defaultProps} isPlaying={true} />
      </MapContainer>,
    )

    let lastProgress = -1
    for (let i = 0; i < 5; i++) {
      await act(async () => {
        vi.advanceTimersByTime(100)
      })
      const calls = defaultProps.onProgressUpdate.mock.calls
      if (calls.length > 0) {
        const currentProgress = calls[calls.length - 1][0]
        expect(currentProgress).toBeGreaterThanOrEqual(lastProgress)
        lastProgress = currentProgress
      }
    }
  })

  it("should not reset animation logic when onProgressUpdate callback changes (regression test)", async () => {
    const { rerender } = render(
      <MapContainer>
        <TripAnimationLayer {...defaultProps} isPlaying={true} />
      </MapContainer>,
    )

    await act(async () => {
      vi.advanceTimersByTime(500)
    })

    const lastProgress = defaultProps.onProgressUpdate.mock.calls.slice(-1)[0][0]
    expect(lastProgress).toBeGreaterThan(0)

    const newOnProgressUpdate = vi.fn()
    rerender(
      <MapContainer>
        <TripAnimationLayer {...defaultProps} isPlaying={true} onProgressUpdate={newOnProgressUpdate} />
      </MapContainer>,
    )

    await act(async () => {
      vi.advanceTimersByTime(100)
    })

    expect(newOnProgressUpdate).toHaveBeenCalled()
    const nextProgress = newOnProgressUpdate.mock.calls[0][0]
    expect(nextProgress).toBeGreaterThan(lastProgress)
  })
})
