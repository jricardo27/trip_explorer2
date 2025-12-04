import { render, screen } from "@testing-library/react"
import { describe, it, expect } from "vitest"

import Tutorial from "./Tutorial"

describe("Tutorial", () => {
  it("should render without crashing", () => {
    render(<Tutorial />)
    expect(screen.getByText("Base layer")).toBeInTheDocument()
    expect(screen.getByText("Points of Interest (POIs)")).toBeInTheDocument()
  })

  it("should render images", () => {
    render(<Tutorial />)
    const images = screen.getAllByRole("img")
    expect(images.length).toBeGreaterThan(0)
  })
})
