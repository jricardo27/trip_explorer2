import React, { useCallback, useState } from "react"

import { selectionInfo } from "../../../contexts/SavedFeaturesContext"

interface UseContextMenu {
  contextMenu: { mouseX: number; mouseY: number } | null
  contextMenuTab: string | null
  contextMenuFeature: selectionInfo | null
  handleContextMenu: (event: React.MouseEvent | React.TouchEvent, selection?: selectionInfo, tab?: string) => void
  handleTabContextMenu: (event: React.MouseEvent | React.TouchEvent, tab: string) => void
  handleClose: () => void
}

export const useContextMenu = (): UseContextMenu => {
  const [contextMenu, setContextMenu] = useState<{ mouseX: number; mouseY: number } | null>(null)
  const [contextMenuTab, setContextMenuTab] = useState<string | null>(null)
  const [contextMenuFeature, setContextMenuFeature] = useState<selectionInfo | null>(null)

  const handleContextMenu = useCallback(
    (event: React.MouseEvent | React.TouchEvent, selection?: selectionInfo, tab?: string) => {
      event.preventDefault()
      event.stopPropagation()

      let clientX: number
      let clientY: number

      // Check if it's a TouchEvent
      if ("touches" in event) {
        // Use the first touch point
        const touch = event.touches[0] || event.changedTouches[0]
        if (touch) {
          clientX = touch.clientX
          clientY = touch.clientY
        } else {
          // Fallback or error handling if no touch points are found
          // This case should ideally not happen for a context menu trigger
          console.warn("TouchEvent for context menu did not have any touch points.")
          return // Don't open context menu if coordinates are not found
        }
      } else {
        // It's a MouseEvent
        clientX = event.clientX
        clientY = event.clientY
      }

      setContextMenu({
        mouseX: clientX + 2,
        mouseY: clientY - 6,
      })
      setContextMenuFeature(selection || null)
      setContextMenuTab(tab || null)
    },
    [],
  )

  const handleTabContextMenu = useCallback(
    (event: React.MouseEvent | React.TouchEvent, tab: string) => {
      handleContextMenu(event, undefined, tab)
    },
    [handleContextMenu],
  )

  const handleClose = useCallback(() => {
    setContextMenu(null)
    setContextMenuTab(null)
    setContextMenuFeature(null)
  }, [])

  return {
    contextMenu,
    contextMenuTab,
    contextMenuFeature,
    handleContextMenu,
    handleTabContextMenu,
    handleClose,
  }
}
