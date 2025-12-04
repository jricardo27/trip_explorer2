import { render, screen, fireEvent } from "@testing-library/react"
import { describe, it, expect, vi } from "vitest"

import { FeatureList } from "./FeatureList"

// Mock sub-components
vi.mock("./SortableFeatureItem", () => ({
  SortableFeatureItem: ({ feature, onClick }: { feature: { properties: { name: string } }; onClick?: () => void }) => (
    <div data-testid="sortable-item" onClick={onClick}>
      {feature.properties.name}
    </div>
  ),
}))

vi.mock("../../NoteEditor/NoteEditor", () => ({
  default: ({ initialText, onChange }: { initialText: string; onChange: (value: string) => void }) => (
    <textarea data-testid="note-editor" value={initialText} onChange={(e) => onChange(e.target.value)} />
  ),
}))

describe("FeatureList", () => {
  const defaultProps = {
    items: [
      {
        feature: {
          type: "Feature",
          properties: { name: "Feature 1", tripNotes: "Note 1" },
          geometry: { type: "Point", coordinates: [0, 0] },
        },
        originalIndex: 0,
      },
      {
        feature: {
          type: "Feature",
          properties: { name: "Feature 2" },
          geometry: { type: "Point", coordinates: [1, 1] },
        },
        originalIndex: 1,
      },
    ],
    setSavedFeatures: vi.fn(),
    selectedTab: "list1",
    selectedFeature: null,
    setSelectedFeature: vi.fn(),
    handleContextMenu: vi.fn(),
    excludedProperties: ["tripNotes"],
  }

  it("should render list of features", () => {
    // @ts-expect-error - Test mock types
    render(<FeatureList {...defaultProps} />)
    expect(screen.getByText("Feature 1")).toBeInTheDocument()
    expect(screen.getByText("Feature 2")).toBeInTheDocument()
  })

  it("should show details when feature is selected", () => {
    const props = {
      ...defaultProps,
      selectedFeature: { feature: defaultProps.items[0].feature, index: 0, category: "list1" },
    }
    // @ts-expect-error - Test mock types
    render(<FeatureList {...props} />)
    expect(screen.getByText("Add/edit notes")).toBeInTheDocument()
  })

  it("should show note editor when button clicked", () => {
    const props = {
      ...defaultProps,
      selectedFeature: { feature: defaultProps.items[0].feature, index: 0, category: "list1" },
    }
    // @ts-expect-error - Test mock types
    render(<FeatureList {...props} />)

    fireEvent.click(screen.getByText("Add/edit notes"))
    expect(screen.getByTestId("note-editor")).toBeInTheDocument()
    expect(screen.getByTestId("note-editor")).toHaveValue("Note 1")
  })

  it("should save notes", () => {
    const props = {
      ...defaultProps,
      selectedFeature: { feature: defaultProps.items[0].feature, index: 0, category: "list1" },
    }
    // @ts-expect-error - Test mock types
    render(<FeatureList {...props} />)

    fireEvent.click(screen.getByText("Add/edit notes"))
    const editor = screen.getByTestId("note-editor")
    fireEvent.change(editor, { target: { value: "Updated Note" } })

    fireEvent.click(screen.getByText("Save notes"))
    expect(defaultProps.setSavedFeatures).toHaveBeenCalled()
  })
})
