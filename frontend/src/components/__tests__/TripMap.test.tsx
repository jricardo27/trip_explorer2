import { render, act, fireEvent } from "@testing-library/react"
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

import { TripMap } from "../TripMap"

// Mocks
const mockAnimation = {
  isPlaying: false,
  handlePlayPause: vi.fn(),
  handleReset: vi.fn(),
  progress: 0,
  settings: {},
  currentAnimation: null,
  setSettings: vi.fn(),
}

vi.mock("../hooks/useMapAnimation", () => ({
  useMapAnimation: () => mockAnimation,
}))

vi.mock("../Map/Animation/AnimationController", () => ({
  AnimationController: ({ visible }: any) => (
    <div data-testid="animation-controls" style={{ opacity: visible ? 1 : 0 }} />
  ),
}))

vi.mock("../Map/Animation/AnimationSettingsSidebar", () => ({
  AnimationSettingsSidebar: ({ visible }: any) => (
    <div data-testid="animation-sidebar" style={{ opacity: visible ? 1 : 0 }} />
  ),
}))

// Mock Leaflet components
/* eslint-disable react/display-name */
const LayersControl = ({ children }: { children: React.ReactNode }) => (
  <div data-testid="layers-control">{children}</div>
)
LayersControl.BaseLayer = ({ children }: { children: React.ReactNode }) => (
  <div data-testid="base-layer">{children}</div>
)

vi.mock("react-leaflet", () => ({
  MapContainer: ({ children }: any) => <div data-testid="map-container">{children}</div>,
  TileLayer: () => <div data-testid="tile-layer" />,
  LayersControl: LayersControl,
  Marker: ({ children }: any) => <div data-testid="marker">{children}</div>,
  Popup: ({ children }: any) => <div data-testid="popup">{children}</div>,
  Polyline: () => <div data-testid="polyline" />,
  CircleMarker: () => <div data-testid="circle-marker" />,
  GeoJSON: () => <div data-testid="geojson" />,
  Tooltip: ({ children }: any) => <div data-testid="tooltip">{children}</div>,
  useMap: vi.fn(() => ({
    flyTo: vi.fn(),
    fitBounds: vi.fn(),
    distance: vi.fn(() => 1000),
    once: vi.fn(),
  })),
  useMapEvents: vi.fn(() => ({
    getCenter: () => ({ lat: 0, lng: 0 }),
    getZoom: () => 13,
  })),
}))
/* eslint-enable react/display-name */

vi.mock("leaflet", () => ({
  default: {
    Icon: { Default: { prototype: { _getIconUrl: vi.fn() }, mergeOptions: vi.fn() } },
    latLngBounds: vi.fn(() => ({
      isValid: () => true,
    })),
    divIcon: vi.fn(),
  },
}))

describe("TripMap Controls Visibility", () => {
  const defaultProps = {
    viewMode: "animation",
    activities: [],
    animations: [
      {
        id: "1",
        name: "Test Anim",
        tripId: "t1",
        settings: {},
        steps: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ],
    selectedAnimationId: "1",
  }

  beforeEach(() => {
    vi.useFakeTimers()
    mockAnimation.isPlaying = false
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllTimers()
    vi.useRealTimers()
  })

  it("should hide controls when playing starts in fullscreen", async () => {
    Object.defineProperty(document, "fullscreenElement", {
      value: document.createElement("div"),
      writable: true,
    })

    const { getByTestId, rerender } = render(<TripMap {...defaultProps} />)

    act(() => {
      document.dispatchEvent(new Event("fullscreenchange"))
    })

    const controls = getByTestId("animation-controls")
    expect(controls.style.opacity).toBe("1")

    mockAnimation.isPlaying = true
    rerender(<TripMap {...defaultProps} />)

    expect(controls.style.opacity).toBe("0")
    const sidebar = getByTestId("animation-sidebar")
    expect(sidebar.style.opacity).toBe("0")
  })

  it("should show controls on mouse move in fullscreen", async () => {
    Object.defineProperty(document, "fullscreenElement", {
      value: document.createElement("div"),
      writable: true,
    })

    const { getByTestId, rerender, container } = render(<TripMap {...defaultProps} />)

    act(() => {
      document.dispatchEvent(new Event("fullscreenchange"))
    })

    mockAnimation.isPlaying = true
    rerender(<TripMap {...defaultProps} />)
    const controls = getByTestId("animation-controls")
    expect(controls.style.opacity).toBe("0")

    await act(async () => {
      fireEvent.mouseMove(container.firstChild as Element)
    })

    expect(controls.style.opacity).toBe("1")

    const sidebar = getByTestId("animation-sidebar")
    expect(sidebar.style.opacity).toBe("0")
  })

  it("should not flicker controls when starting playback in fullscreen", async () => {
    Object.defineProperty(document, "fullscreenElement", {
      value: document.createElement("div"),
      writable: true,
    })

    const { getByTestId, rerender } = render(<TripMap {...defaultProps} />)

    act(() => {
      document.dispatchEvent(new Event("fullscreenchange"))
    })

    const controls = getByTestId("animation-controls")
    expect(controls.style.opacity).toBe("1")

    mockAnimation.isPlaying = true
    rerender(<TripMap {...defaultProps} />)

    expect(controls.style.opacity).toBe("0")
  })

  it("should reset map view when stopping in fullscreen", () => {
    render(
      <TripMap
        {...defaultProps}
        activities={
          [
            { id: "1", name: "A1", latitude: 10, longitude: 20, tripId: "t1", createdAt: "", updatedAt: "" },
            { id: "2", name: "A2", latitude: 15, longitude: 25, tripId: "t1", createdAt: "", updatedAt: "" },
          ] as any[]
        }
      />,
    )

    Object.defineProperty(document, "fullscreenElement", {
      value: document.createElement("div"),
      writable: true,
    })

    act(() => {
      document.dispatchEvent(new Event("fullscreenchange"))
    })

    expect(mockAnimation.handleReset).toBeDefined()
  })
})
