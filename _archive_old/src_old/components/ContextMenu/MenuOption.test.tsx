import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, it, expect, vi } from "vitest"

import MenuOption from "./MenuOption"

describe("MenuOption", () => {
  it("should render title", () => {
    render(<MenuOption title="Test Option" handler={vi.fn()} />)
    expect(screen.getByText("Test Option")).toBeInTheDocument()
  })

  it("should call handler and closeMenu on click", async () => {
    const handler = vi.fn()
    const closeMenu = vi.fn()
    const payload = { coordinates: { lat: 10, lng: 20 } }

    render(<MenuOption title="Test Option" handler={handler} closeMenu={closeMenu} payload={payload} />)

    const user = userEvent.setup()
    await user.click(screen.getByText("Test Option"))

    expect(handler).toHaveBeenCalledWith(payload)
    expect(closeMenu).toHaveBeenCalled()
  })

  it("should not call handler if payload is missing", async () => {
    const handler = vi.fn()
    const closeMenu = vi.fn()

    render(<MenuOption title="Test Option" handler={handler} closeMenu={closeMenu} />)

    const user = userEvent.setup()
    await user.click(screen.getByText("Test Option"))

    expect(handler).not.toHaveBeenCalled()
    expect(closeMenu).toHaveBeenCalled()
  })
})
