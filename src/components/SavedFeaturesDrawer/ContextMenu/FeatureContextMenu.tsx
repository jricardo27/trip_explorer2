import { Menu, MenuItem } from "@mui/material"
import React from "react"

import { DEFAULT_CATEGORY, selectionInfo } from "../../../contexts/SavedFeaturesContext"

interface FeatureContextMenuProps {
  contextMenu: { mouseX: number; mouseY: number } | null
  contextMenuFeature: selectionInfo | null
  handleClose: () => void
  handleDuplicate: () => void
  handleRemoveFromList: () => void
  handleRemoveCompletely: () => void
}

export const FeatureContextMenu: React.FC<FeatureContextMenuProps> = ({
  contextMenu,
  contextMenuFeature,
  handleClose,
  handleDuplicate,
  handleRemoveFromList,
  handleRemoveCompletely,
}) => {
  const wrapper = (handler: (event: React.MouseEvent) => void) => {
    return (event: React.MouseEvent) => {
      handler(event)
      handleClose()
    }
  }

  const preventDefault = (event: React.MouseEvent) => {
    event.preventDefault()
    handleClose()
  }

  if (!contextMenuFeature) return null

  return (
    <Menu
      open={contextMenu !== null}
      onClose={handleClose}
      onContextMenu={preventDefault}
      anchorReference="anchorPosition"
      anchorPosition={contextMenu !== null ? { top: contextMenu.mouseY, left: contextMenu.mouseX } : undefined}
    >
      <MenuItem onClick={wrapper(handleDuplicate)}>Duplicate</MenuItem>
      {contextMenuFeature.category !== DEFAULT_CATEGORY && (
        <MenuItem onClick={wrapper(handleRemoveFromList)}>Remove from this list</MenuItem>
      )}
      <MenuItem onClick={wrapper(handleRemoveCompletely)}>Remove</MenuItem>
    </Menu>
  )
}
