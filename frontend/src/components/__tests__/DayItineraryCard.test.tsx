import { render, screen } from "@testing-library/react"
import { vi, describe, it, expect } from "vitest"

import type { Trip, TripDay, Activity, TransportAlternative } from "../../types"
import { DayItineraryCard } from "../DayItineraryCard"

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
    estimatedCost: "50", // Cost 50
    createdAt: "",
    updatedAt: "",
  }

  const mockActivity2: Activity = {
    id: "a2",
    tripDayId: "day1",
    name: "Activity 2",
    scheduledStart: "2023-01-01T14:00:00Z",
    scheduledEnd: "2023-01-01T16:00:00Z",
    estimatedCost: "30", // Cost 30
    createdAt: "",
    updatedAt: "",
  }

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
  }

  const mockDay: TripDay = {
    id: "day1",
    tripId: "trip1",
    dayNumber: 1,
    date: "2023-01-01",
    activities: [mockActivity1, mockActivity2],
  }

  const mockTrip: Trip = {
    id: "trip1",
    userId: "u1",
    name: "Test Trip",
    startDate: "2023-01-01",
    endDate: "2023-01-05",
    transport: [mockTransport],
    createdAt: "",
    updatedAt: "",
  }

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
  }

  it("calculates total cost including activities and transport", () => {
    // Activities: 50 + 30 = 80
    // Transport: 20
    // Total: 100
    render(<DayItineraryCard {...defaultProps} />)

    // Look for the chip with the cost
    const costChip = screen.getByText("$100 (A: $80 T: $20)")
    expect(costChip).toBeInTheDocument()
  })

  it("excludes unselected transport from cost", () => {
    const unselectedTransport = { ...mockTransport, isSelected: false }
    const tripWithUnselected = { ...mockTrip, transport: [unselectedTransport] }

    // Total should be 80 (activities only)
    render(<DayItineraryCard {...defaultProps} trip={tripWithUnselected} />)

    const costChip = screen.getByText("$80 (A: $80 T: $0)")
    expect(costChip).toBeInTheDocument()
  })

  it("calculates cost correctly with no transport", () => {
    const tripNoTransport = { ...mockTrip, transport: [] }

    // Total should be 80
    render(<DayItineraryCard {...defaultProps} trip={tripNoTransport} />)

    const costChip = screen.getByText("$80 (A: $80 T: $0)")
    expect(costChip).toBeInTheDocument()
  })
})
