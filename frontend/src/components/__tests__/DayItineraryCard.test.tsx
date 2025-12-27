import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen } from "@testing-library/react"
import { vi, describe, it, expect } from "vitest"

import type { Trip, TripDay, Activity, TransportAlternative } from "../../types"
import { DayItineraryCard } from "../DayItineraryCard"

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false, // Disable retries for tests
    },
  },
})

const renderWithProvider = (ui: React.ReactElement) => {
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>)
}

// Mock DND components to avoid errors
vi.mock("@dnd-kit/core", () => ({
  useDroppable: () => ({ setNodeRef: vi.fn() }),
  useSensor: vi.fn(),
  useSensors: vi.fn(),
  PointerSensor: vi.fn(),
}))

vi.mock("@dnd-kit/sortable", () => ({
  SortableContext: ({ children }: any) => <>{children}</>,
  verticalListSortingStrategy: {},
  useSortable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: vi.fn(),
    transform: null,
    transition: null,
    isDragging: false,
  }),
}))

describe("DayItineraryCard", () => {
  const mockActivity1: Activity = {
    id: "a1",
    tripDayId: "day1",
    name: "Activity 1",
    scheduledStart: "2023-01-01T10:00:00Z",
    scheduledEnd: "2023-01-01T12:00:00Z",
    estimatedCost: 50, // Cost 50
    createdAt: "",
    updatedAt: "",
  } as any

  const mockActivity2: Activity = {
    id: "a2",
    tripDayId: "day1",
    name: "Activity 2",
    scheduledStart: "2023-01-01T14:00:00Z",
    scheduledEnd: "2023-01-01T16:00:00Z",
    estimatedCost: 30, // Cost 30
    createdAt: "",
    updatedAt: "",
  } as any

  const mockTransport: TransportAlternative = {
    id: "t1",
    tripId: "trip1",
    fromActivityId: "a1", // Matches activity 1
    toActivityId: "a2",
    transportMode: "DRIVING" as any,
    durationMinutes: 30,
    cost: 20, // Cost 20
    isSelected: true, // Needs to be selected to count
    createdAt: "",
  } as any

  const mockDay: TripDay = {
    id: "day1",
    tripId: "trip1",
    dayNumber: 1,
    date: "2023-01-01",
    activities: [mockActivity1, mockActivity2],
  } as any

  const mockTrip: Trip = {
    id: "trip1",
    userId: "u1",
    name: "Test Trip",
    startDate: "2023-01-01",
    endDate: "2023-01-05",
    transport: [mockTransport],
    createdAt: "",
    updatedAt: "",
  } as any

  const defaultProps = {
    day: mockDay,
    trip: mockTrip,
    isCollapsed: false,
    canEdit: true,
    onToggleCollapse: vi.fn(),
    onAddActivity: vi.fn(),
    onEditActivity: vi.fn(),
    onDeleteActivity: vi.fn(),
    onCopyActivity: vi.fn(),
    onFlyTo: vi.fn(),
    exchangeRates: {},
  }

  it("calculates total cost including activities and transport", () => {
    // Activities: 50 + 30 = 80
    // Transport: 20
    // Total: 100
    renderWithProvider(<DayItineraryCard {...defaultProps} />)

    // Look for the formatted cost. Since Intl.NumberFormat can vary by environment,
    // we'll look for the value 100.
    const costElements = screen.getAllByText(/100/)
    expect(costElements.length).toBeGreaterThan(0)
  })

  it("excludes unselected transport from cost", () => {
    const unselectedTransport = { ...mockTransport, isSelected: false }
    const tripWithUnselected = { ...mockTrip, transport: [unselectedTransport] }

    // Total should be 80 (activities only)
    renderWithProvider(<DayItineraryCard {...defaultProps} trip={tripWithUnselected} />)

    const costElements = screen.getAllByText(/80/)
    expect(costElements.length).toBeGreaterThan(0)
  })

  it("calculates cost correctly with no transport", () => {
    const tripNoTransport = { ...mockTrip, transport: [] }

    // Total should be 80
    renderWithProvider(<DayItineraryCard {...defaultProps} trip={tripNoTransport} />)

    const costElements = screen.getAllByText(/80/)
    expect(costElements.length).toBeGreaterThan(0)
  })
})
