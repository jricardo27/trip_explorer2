import { render, screen } from "@testing-library/react"
import { describe, it, expect } from "vitest"

import Technical from "./Technical"

describe("Technical", () => {
  it("should render without crashing", () => {
    render(<Technical />)
    expect(screen.getByText(/This app was written as a hobby project/i)).toBeInTheDocument()
  })

  it("should render technical details list", () => {
    render(<Technical />)
    expect(screen.getByText(/Vite 6 as build tool/i)).toBeInTheDocument()
    expect(screen.getByText(/React 18 as base library/i)).toBeInTheDocument()
  })
})
