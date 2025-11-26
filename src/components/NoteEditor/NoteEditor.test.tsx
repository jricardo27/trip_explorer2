import { render, screen, fireEvent } from "@testing-library/react"
import { describe, it, expect, vi } from "vitest"

import NoteEditor from "./NoteEditor"

// Mock TinyMCE Editor
vi.mock("@tinymce/tinymce-react", () => ({
  Editor: ({
    value,
    onEditorChange,
    onChange,
  }: {
    value: string
    onEditorChange: (value: string) => void
    onChange: (value: string) => void
  }) => (
    <textarea
      data-testid="mock-editor"
      value={value}
      onChange={(e) => {
        onEditorChange(e.target.value)
        onChange(e.target.value)
      }}
    />
  ),
}))

describe("NoteEditor", () => {
  it("should render with initial text", () => {
    render(<NoteEditor initialText="Initial Note" onChange={vi.fn()} />)
    expect(screen.getByTestId("mock-editor")).toHaveValue("Initial Note")
  })

  it("should call onChange when content changes", () => {
    const handleChange = vi.fn()
    render(<NoteEditor initialText="" onChange={handleChange} />)

    const editor = screen.getByTestId("mock-editor")
    fireEvent.change(editor, { target: { value: "New Content" } })

    expect(handleChange).toHaveBeenCalledWith("New Content")
  })
})
