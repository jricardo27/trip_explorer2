import { render, screen } from "@testing-library/react"
import React from "react"
import { describe, it, expect } from "vitest"

import About from "./About"

describe("About", () => {
  it("should render without crashing", () => {
    render(<About />)
    expect(screen.getByText(/Trip Explorer is a simple application/i)).toBeInTheDocument()
  })

  it("should render source links", () => {
    render(<About />)
    expect(screen.getByText("OpenStreetMap")).toBeInTheDocument()
    expect(screen.getByText("Campermate")).toBeInTheDocument()
  })
})
