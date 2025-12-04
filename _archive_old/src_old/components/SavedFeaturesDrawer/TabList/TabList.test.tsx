import { render, screen, fireEvent } from "@testing-library/react"
import { vi, describe, it, expect } from "vitest"

import { TabList } from "./TabList"

describe("TabList", () => {
  const mockHandleTabChange = vi.fn()
  const mockHandleTabContextMenu = vi.fn()
  const tabs = ["Tab 1", "Tab 2"]

  it("should render tabs", () => {
    render(
      <TabList
        tabs={tabs}
        selectedTab="Tab 1"
        handleTabChange={mockHandleTabChange}
        handleTabContextMenu={mockHandleTabContextMenu}
      />,
    )

    expect(screen.getByText("Tab 1")).toBeInTheDocument()
    expect(screen.getByText("Tab 2")).toBeInTheDocument()
  })

  it("should call handleTabChange when a tab is clicked", () => {
    render(
      <TabList
        tabs={tabs}
        selectedTab="Tab 1"
        handleTabChange={mockHandleTabChange}
        handleTabContextMenu={mockHandleTabContextMenu}
      />,
    )

    fireEvent.click(screen.getByText("Tab 2"))
    expect(mockHandleTabChange).toHaveBeenCalled()
  })

  it("should call handleTabContextMenu on right click", () => {
    render(
      <TabList
        tabs={tabs}
        selectedTab="Tab 1"
        handleTabChange={mockHandleTabChange}
        handleTabContextMenu={mockHandleTabContextMenu}
      />,
    )

    fireEvent.contextMenu(screen.getByText("Tab 1"))
    expect(mockHandleTabContextMenu).toHaveBeenCalled()
  })
})
