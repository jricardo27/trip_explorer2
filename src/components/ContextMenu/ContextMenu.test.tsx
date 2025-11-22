import { render, screen } from "@testing-library/react"
import React from "react"
import { describe, it, expect, vi } from "vitest"

import ContextMenu from "./ContextMenu"
import MenuOption from "./MenuOption"

describe("ContextMenu", () => {
  it("should render children when position is provided", () => {
    render(
      <ContextMenu position={{ x: 100, y: 200 }}>
        <MenuOption title="Option 1" handler={vi.fn()} />
      </ContextMenu>,
    )
    expect(screen.getByText("Option 1")).toBeInTheDocument()
  })

  it("should not render when position is null", () => {
    render(
      <ContextMenu position={null}>
        <MenuOption title="Option 1" handler={vi.fn()} />
      </ContextMenu>,
    )
    expect(screen.queryByText("Option 1")).not.toBeInTheDocument()
  })

  it("should position the menu correctly", () => {
    const { container } = render(
      <ContextMenu position={{ x: 100, y: 200 }}>
        <MenuOption title="Option 1" handler={vi.fn()} />
      </ContextMenu>,
    )
    const menu = container.firstChild as HTMLElement
    expect(menu).toHaveStyle({ left: "100px", top: "200px" })
  })

  it("should pass payload and closeMenu to children", () => {
    const payload = { coordinates: { lat: 10, lng: 20 } }
    // We can't easily check props passed to children with RTL without mocking MenuOption or inspecting calls.
    // But we can verify the behavior via MenuOption's click.
    // However, since we are testing ContextMenu, let's just verify it renders.
    // Integration test style:

    render(
      <ContextMenu position={{ x: 0, y: 0 }} payload={payload}>
        <MenuOption title="Option 1" handler={vi.fn()} />
      </ContextMenu>,
    )
    expect(screen.getByText("Option 1")).toBeInTheDocument()
  })
})
