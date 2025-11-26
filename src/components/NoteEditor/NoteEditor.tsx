import { Editor as TinyMCEEditor } from "@tinymce/tinymce-react"
import React, { useState } from "react"

import { TAny } from "../../data/types"

import styles from "./NoteEditor.module.css"

interface EditorProps {
  initialText: string
  onChange: (content: string) => void
}

const NoteEditor: React.FC<EditorProps> = ({ initialText, onChange }) => {
  const [contentEditor, setContentEditor] = useState(initialText)
  const handleEditorChange = (content: TAny) => {
    if (typeof content === "string") {
      setContentEditor(content)
      onChange(content)
    }
  }

  return (
    <div className={styles["tinymce-editor"]}>
      <TinyMCEEditor
        onChange={handleEditorChange}
        init={{
          height: 400,
          width: "100%",
          menubar: false,
          plugins: ["lists", "advlist", "fullscreen", "autolink", "charmap", "code", "image", "link", "table"],
          toolbar: [
            "undo redo bold italic backcolor image charmap link" +
              " | advlist bullist numlist outdent indent table | code  fullscreen",
          ],
          skin_url: "./tinymce/skins/ui/oxide",
        }}
        value={contentEditor}
        onEditorChange={handleEditorChange}
        licenseKey="gpl"
      />
    </div>
  )
}

export default NoteEditor
