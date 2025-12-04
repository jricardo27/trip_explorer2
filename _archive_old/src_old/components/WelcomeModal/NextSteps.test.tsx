import { render, screen } from "@testing-library/react"
import { describe, it, expect } from "vitest"

import NextSteps from "./NextSteps"

describe("NextSteps", () => {
  it("should render without crashing", () => {
    render(<NextSteps />)
    expect(screen.getByText(/There are a number of features/i)).toBeInTheDocument()
  })

  it("should render list items", () => {
    render(<NextSteps />)
    expect(screen.getByText("Calculate driving/walking distances between POIs")).toBeInTheDocument()
    expect(screen.getByText("Improve experience on mobile devices")).toBeInTheDocument()
  })

  it("should render issue tracker link", () => {
    render(<NextSteps />)
    expect(screen.getByText("issue tracker")).toHaveAttribute(
      "href",
      "https://github.com/jricardo27/trip_explorer/issues",
    )
  })
})
