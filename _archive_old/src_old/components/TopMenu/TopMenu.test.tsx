import { render, screen, fireEvent } from "@testing-library/react"
import React from "react"
import { BrowserRouter } from "react-router-dom"
import { describe, it, expect, vi } from "vitest"

import SavedFeaturesContext from "../../contexts/SavedFeaturesContext"

import { saveAsGeoJson } from "./saveAsGeoJson"
import TopMenu from "./TopMenu"

// Mock dependencies
vi.mock("./saveAsGeoJson", () => ({
  saveAsGeoJson: vi.fn(),
}))
vi.mock("./saveAsKml", () => ({
  saveAsKml: vi.fn(),
}))
vi.mock("./saveAsBackup", () => ({
  saveAsBackup: vi.fn(),
}))
vi.mock("./importBackup", () => ({
  importBackup: vi.fn(),
}))
vi.mock("../WelcomeModal/WelcomeModal", () => ({
  default: ({ open }: { open: boolean }) => (open ? <div>Welcome Modal</div> : null),
}))

const mockContextValue = {
  savedFeatures: {},
  setSavedFeatures: vi.fn(),
  addFeature: vi.fn(),
  removeFeature: vi.fn(),
  updateFeature: vi.fn(),
  saveToLocalStorage: vi.fn(),
  loadFromLocalStorage: vi.fn(),
  userId: "test-user",
  setUserId: vi.fn(),
  email: "test@example.com",
  login: vi.fn(),
  logout: vi.fn(),
}

const renderWithProviders = (component: React.ReactNode) => {
  return render(
    <SavedFeaturesContext.Provider value={mockContextValue}>
      <BrowserRouter>{component}</BrowserRouter>
    </SavedFeaturesContext.Provider>,
  )
}

describe("TopMenu", () => {
  it("should render title", () => {
    renderWithProviders(<TopMenu onMenuClick={vi.fn()} />)
    expect(screen.getByText("Trip Explorer")).toBeInTheDocument()
  })

  it("should open export menu", () => {
    renderWithProviders(<TopMenu onMenuClick={vi.fn()} />)
    const exportButton = screen.getByLabelText("Export")
    fireEvent.click(exportButton)
    expect(screen.getByText("To GeoJson")).toBeInTheDocument()
  })

  it("should call saveAsGeoJson when clicked", () => {
    renderWithProviders(<TopMenu onMenuClick={vi.fn()} />)
    const exportButton = screen.getByLabelText("Export")
    fireEvent.click(exportButton)
    const geoJsonOption = screen.getByText("To GeoJson")
    fireEvent.click(geoJsonOption)
    expect(saveAsGeoJson).toHaveBeenCalled()
  })

  it("should open welcome modal", () => {
    renderWithProviders(<TopMenu onMenuClick={vi.fn()} />)
    const helpButton = screen.getByLabelText("Help")
    fireEvent.click(helpButton)
    expect(screen.getByText("Welcome Modal")).toBeInTheDocument()
  })
})
