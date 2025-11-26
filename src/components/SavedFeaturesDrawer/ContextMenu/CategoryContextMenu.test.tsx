import { render, screen, fireEvent } from "@testing-library/react"
import { describe, it, expect, vi } from "vitest"

import { CategoryContextMenu } from "./CategoryContextMenu"

describe("CategoryContextMenu", () => {
  const defaultProps = {
    contextMenu: { mouseX: 100, mouseY: 100 },
    contextMenuTab: "Test Category",
    handleClose: vi.fn(),
    moveCategory: vi.fn(),
    handleRenameCategory: vi.fn(),
    handleAddCategory: vi.fn(),
    handleRemoveCategory: vi.fn(),
  }

  it("should render all options for a custom category", () => {
    render(<CategoryContextMenu {...defaultProps} />)
    expect(screen.getByText("Move Up")).toBeInTheDocument()
    expect(screen.getByText("Move Down")).toBeInTheDocument()
    expect(screen.getByText("Rename Category")).toBeInTheDocument()
    expect(screen.getByText("Remove Category")).toBeInTheDocument()
    expect(screen.getByText("Add New Category")).toBeInTheDocument()
  })

  it("should render only 'Add New Category' for default category", () => {
    render(<CategoryContextMenu {...defaultProps} contextMenuTab="all" />)
    expect(screen.queryByText("Move Up")).not.toBeInTheDocument()
    expect(screen.getByText("Add New Category")).toBeInTheDocument()
  })

  it("should call handlers", () => {
    render(<CategoryContextMenu {...defaultProps} />)

    fireEvent.click(screen.getByText("Move Up"))
    expect(defaultProps.moveCategory).toHaveBeenCalledWith("up")

    fireEvent.click(screen.getByText("Remove Category"))
    expect(defaultProps.handleRemoveCategory).toHaveBeenCalled()

    fireEvent.click(screen.getByText("Add New Category"))
    expect(defaultProps.handleAddCategory).toHaveBeenCalled()
  })

  it("should handle rename", () => {
    const promptSpy = vi.spyOn(window, "prompt").mockReturnValue("New Name")
    render(<CategoryContextMenu {...defaultProps} />)

    fireEvent.click(screen.getByText("Rename Category"))
    expect(promptSpy).toHaveBeenCalled()
    expect(defaultProps.handleRenameCategory).toHaveBeenCalledWith("New Name")
  })
})
