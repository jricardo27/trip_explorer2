import { render, screen, fireEvent } from "@testing-library/react"
import { describe, it, expect, vi } from "vitest"

import { FeatureContextMenu } from "./FeatureContextMenu"

describe("FeatureContextMenu", () => {
  const defaultProps = {
    contextMenu: { mouseX: 100, mouseY: 100 },
    contextMenuFeature: {
      feature: { type: "Feature", properties: {}, geometry: { type: "Point", coordinates: [0, 0] } },
      category: "Test Category",
      index: 0,
    },
    handleClose: vi.fn(),
    handleDuplicate: vi.fn(),
    handleRemoveFromList: vi.fn(),
    handleRemoveCompletely: vi.fn(),
  }

  it("should render all options for a custom category feature", () => {
    // @ts-expect-error - Test mock types
    render(<FeatureContextMenu {...defaultProps} />)
    expect(screen.getByText("Duplicate")).toBeInTheDocument()
    expect(screen.getByText("Remove from this list")).toBeInTheDocument()
    expect(screen.getByText("Remove")).toBeInTheDocument()
  })

  it("should not render 'Remove from this list' for default category", () => {
    const props = {
      ...defaultProps,
      contextMenuFeature: { ...defaultProps.contextMenuFeature, category: "all" },
    }
    // @ts-expect-error - Test mock types
    render(<FeatureContextMenu {...props} />)
    expect(screen.queryByText("Remove from this list")).not.toBeInTheDocument()
  })

  it("should call handlers", () => {
    // @ts-expect-error - Test mock types
    render(<FeatureContextMenu {...defaultProps} />)

    fireEvent.click(screen.getByText("Duplicate"))
    expect(defaultProps.handleDuplicate).toHaveBeenCalled()

    fireEvent.click(screen.getByText("Remove from this list"))
    expect(defaultProps.handleRemoveFromList).toHaveBeenCalled()

    fireEvent.click(screen.getByText("Remove"))
    expect(defaultProps.handleRemoveCompletely).toHaveBeenCalled()
  })
})
