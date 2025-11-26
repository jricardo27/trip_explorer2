import { render, screen, fireEvent } from "@testing-library/react"
import { describe, it, expect, vi } from "vitest"

import WelcomeModal from "./WelcomeModal"

// Mock sub-components
vi.mock("./About", () => ({ default: () => <div>About Content</div> }))
vi.mock("./Tutorial", () => ({ default: () => <div>Tutorial Content</div> }))
vi.mock("./NextSteps", () => ({ default: () => <div>Next Steps Content</div> }))
vi.mock("./Technical", () => ({ default: () => <div>Technical Content</div> }))

describe("WelcomeModal", () => {
  it("should render when open is true", () => {
    render(<WelcomeModal open={true} onClose={vi.fn()} />)
    expect(screen.getByText("Welcome to Trip Explorer (by Ricardo Perez)")).toBeInTheDocument()
    expect(screen.getByText("About Content")).toBeInTheDocument()
  })

  it("should not render when open is false", () => {
    render(<WelcomeModal open={false} onClose={vi.fn()} />)
    expect(screen.queryByText("Welcome to Trip Explorer (by Ricardo Perez)")).not.toBeInTheDocument()
  })

  it("should switch tabs", () => {
    render(<WelcomeModal open={true} onClose={vi.fn()} />)

    // Initial state
    expect(screen.getByText("About Content")).toBeInTheDocument()

    // Click Tutorial tab
    fireEvent.click(screen.getByText("Tutorial"))
    expect(screen.getByText("Tutorial Content")).toBeInTheDocument()
    expect(screen.queryByText("About Content")).not.toBeInTheDocument()

    // Click What's Next tab
    fireEvent.click(screen.getByText("What's Next"))
    expect(screen.getByText("Next Steps Content")).toBeInTheDocument()

    // Click Technical Stuff tab
    fireEvent.click(screen.getByText("Technical Stuff"))
    expect(screen.getByText("Technical Content")).toBeInTheDocument()
  })
})
