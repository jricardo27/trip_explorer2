import { useDroppable } from "@dnd-kit/core"
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { Box, Paper, Typography } from "@mui/material"
import React from "react"

import { DayLocation, TripDay, TripFeature } from "../../contexts/TripContext"

import { DraggableCalendarItem } from "./DraggableCalendarItem"

interface CalendarDayCellProps {
  day: TripDay
  items: (DayLocation | TripFeature)[]
  onItemClick: (item: DayLocation | TripFeature) => void
}

export const CalendarDayCell: React.FC<CalendarDayCellProps> = ({ day, items, onItemClick }) => {
  const { setNodeRef, isOver } = useDroppable({
    id: day.id,
    data: { dayId: day.id, date: day.date },
  })

  const itemIds = items.map((item) => ("city" in item ? item.id : item.saved_id || item.properties.id))

  const dayDate = new Date(day.date)
  const dayName = dayDate.toLocaleDateString("en-US", { weekday: "short" })
  const dayNumber = dayDate.getDate()
  const monthName = dayDate.toLocaleDateString("en-US", { month: "short" })

  return (
    <Paper
      ref={setNodeRef}
      sx={{
        minWidth: 250,
        minHeight: 400,
        p: 2,
        bgcolor: isOver ? "action.hover" : "background.paper",
        border: 2,
        borderColor: isOver ? "primary.main" : "divider",
        transition: "all 0.2s",
      }}
    >
      {/* Day Header */}
      <Box sx={{ mb: 2, pb: 1, borderBottom: 2, borderColor: "divider" }}>
        <Typography variant="caption" color="text.secondary">
          {dayName}
        </Typography>
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          {monthName} {dayNumber}
        </Typography>
      </Box>

      {/* Items List */}
      <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
        <Box>
          {items.length === 0 ? (
            <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 4 }}>
              No items
            </Typography>
          ) : (
            items.map((item) => {
              const itemId = "city" in item ? item.id : item.saved_id || item.properties.id
              return (
                <DraggableCalendarItem
                  key={itemId}
                  item={item}
                  itemId={itemId}
                  dayId={day.id}
                  onClick={() => onItemClick(item)}
                />
              )
            })
          )}
        </Box>
      </SortableContext>
    </Paper>
  )
}
