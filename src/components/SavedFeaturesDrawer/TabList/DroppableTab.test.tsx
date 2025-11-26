import { render, screen } from "@testing-library/react"
import { describe, it, expect, vi } from "vitest"

import DroppableTab from "./DroppableTab"

// Mock dnd-kit
vi.mock("@dnd-kit/core", () => ({
  useDroppable: () => ({
    setNodeRef: vi.fn(),
    node: {},
  }),
}))

describe("DroppableTab", () => {
  it("should render tab label", () => {
    render(<DroppableTab tab="Tab 1" onContextMenu={vi.fn()} value="Tab 1" />)
    expect(screen.getByText("Tab 1")).toBeInTheDocument()
  })
})
