import { render, screen } from "@testing-library/react"
import { describe, it, expect, vi } from "vitest"

import PopupContent from "./PopupContent"

// Mock react-image-gallery
vi.mock("react-image-gallery", () => ({
  default: () => <div data-testid="image-gallery" />,
}))

describe("PopupContent", () => {
  const defaultFeature = {
    type: "Feature" as const,
    properties: {
      name: "Test Feature",
      description: "Test Description",
      images: ["img1.jpg"],
    },
    geometry: { type: "Point" as const, coordinates: [0, 0] },
  }

  const defaultTabMapping = {
    General: ["name", "description"],
  }

  it("should render feature properties", () => {
    render(<PopupContent feature={defaultFeature} tabMapping={defaultTabMapping} />)
    expect(screen.getByText("name:")).toBeInTheDocument()
    expect(screen.getByText("Test Feature")).toBeInTheDocument()
    expect(screen.getByText("description:")).toBeInTheDocument()
    expect(screen.getByText("Test Description")).toBeInTheDocument()
  })

  it("should render gallery tab if images exist", () => {
    render(<PopupContent feature={defaultFeature} tabMapping={defaultTabMapping} />)
    // On large screens (default in test env usually), gallery is side-by-side, not a tab.
    // But ImageGallery should be rendered.
    expect(screen.getByTestId("image-gallery")).toBeInTheDocument()
  })

  it("should render bottom menu if provided", () => {
    render(
      <PopupContent feature={defaultFeature} tabMapping={defaultTabMapping} bottomMenu={<button>Action</button>} />,
    )
    expect(screen.getByText("Action")).toBeInTheDocument()
  })
})
