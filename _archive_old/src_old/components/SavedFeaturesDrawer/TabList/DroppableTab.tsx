import { useDroppable } from "@dnd-kit/core"
import { Tab, TabProps } from "@mui/material"
import React from "react"

import { useLongPress } from "../../../hooks/useLongPress" // Import useLongPress

interface DroppableTabProps extends TabProps {
  tab: string // This is the tab identifier
  onContextMenu: (event: React.MouseEvent | React.TouchEvent) => void
}

const DroppableTab: React.FC<DroppableTabProps> = ({ tab, onContextMenu, value, ...otherProps }) => {
  const { setNodeRef, node } = useDroppable({
    id: tab,
    data: { category: tab, type: "tab" },
  })

  const longPressProps = useLongPress(
    (event) => {
      onContextMenu(event)
    },
    500, // Duration for long press
  )

  return (
    <Tab
      ref={setNodeRef}
      label={tab}
      value={value} // `value` is used by MUI Tabs, and it's the same as `tab` identifier
      // Spread the longPressProps. This will include onTouchStart, onTouchMove, onTouchEnd,
      // and onContextMenu (which handles preventDefault).
      {...longPressProps}
      // The original onContextMenu={onContextMenu} is now effectively handled by longPressProps.onContextMenu
      // if you want to retain a separate direct right-click for desktop that bypasses long press logic (e.g., faster),
      // you might need to alias the prop from useLongPress or handle it conditionally.
      // However, the useLongPress onContextMenu already calls preventDefault, which is the primary goal for context menus.
      // And the callback onLongPress will trigger the passed onContextMenu.
      sx={{
        // Visual feedback when draggable item is over
        // @ts-expect-error rect is not defined in node
        border: node?.rect ? "1px dashed #ccc" : "none",
      }}
      {...otherProps}
    />
  )
}

export default DroppableTab
