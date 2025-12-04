import { useDroppable } from "@dnd-kit/core"
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { Box, Paper, Typography } from "@mui/material"
import React, { useMemo } from "react"

import { DayLocation, TripDay, TripFeature } from "../../contexts/TripContext"

import { CalendarItem } from "./CalendarItem"
import { DraggableCalendarItem } from "./DraggableCalendarItem"

interface CalendarDayCellProps {
  day: TripDay
  items: (DayLocation | TripFeature)[]
  onItemClick: (item: DayLocation | TripFeature) => void
  pixelsPerMinute?: number
}

interface PositionedItem {
  item: DayLocation | TripFeature
  top: number
  height: number
  column: number
  totalColumns: number
}

function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number)
  return hours * 60 + minutes
}

function detectOverlaps(items: PositionedItem[]): PositionedItem[] {
  const sorted = [...items].sort((a, b) => a.top - b.top)
  const result: PositionedItem[] = []

  for (let i = 0; i < sorted.length; i++) {
    const current = sorted[i]
    const overlapping = [current]

    // Find all items that overlap with current
    for (let j = i + 1; j < sorted.length; j++) {
      const other = sorted[j]
      const currentEnd = current.top + current.height

      if (other.top < currentEnd) {
        overlapping.push(other)
      }
    }

    // Assign columns to overlapping items
    const columns = overlapping.length
    overlapping.forEach((item, index) => {
      result.push({
        ...item,
        column: index,
        totalColumns: columns,
      })
    })

    // Skip items we've already processed
    i += overlapping.length - 1
  }

  return result
}

export const CalendarDayHeader: React.FC<{ day: TripDay }> = ({ day }) => {
  const dayDate = new Date(day.date)
  const dayName = dayDate.toLocaleDateString("en-US", { weekday: "short" })
  const dayNumber = dayDate.getDate()
  const monthName = dayDate.toLocaleDateString("en-US", { month: "short" })

  return (
    <Paper
      sx={{
        minWidth: 250,
        p: 2,
        pb: 1,
        borderBottom: 2,
        borderColor: "divider",
        bgcolor: "background.paper",
        borderRadius: 0,
        borderRight: 1,
        borderRightColor: "divider",
      }}
      elevation={0}
    >
      <Typography variant="caption" color="text.secondary">
        {dayName}
      </Typography>
      <Typography variant="h6" sx={{ fontWeight: 600 }}>
        {monthName} {dayNumber}
      </Typography>
    </Paper>
  )
}

export const CalendarDayColumn: React.FC<CalendarDayCellProps> = ({ day, items, onItemClick, pixelsPerMinute = 2 }) => {
  const { setNodeRef, isOver } = useDroppable({
    id: day.id,
    data: { dayId: day.id, date: day.date },
  })

  const hourHeight = 60 * pixelsPerMinute
  const totalHeight = 24 * hourHeight

  // Separate scheduled and unscheduled items
  const { scheduledItems, unscheduledItems } = useMemo(() => {
    const scheduled: PositionedItem[] = []
    const unscheduled: (DayLocation | TripFeature)[] = []

    items.forEach((item) => {
      if (item.start_time) {
        const startMinutes = timeToMinutes(item.start_time)
        const duration = item.duration_minutes || 60
        scheduled.push({
          item,
          top: startMinutes * pixelsPerMinute,
          height: duration * pixelsPerMinute,
          column: 0,
          totalColumns: 1,
        })
      } else {
        unscheduled.push(item)
      }
    })

    return {
      scheduledItems: detectOverlaps(scheduled),
      unscheduledItems: unscheduled,
    }
  }, [items, pixelsPerMinute])

  return (
    <Box
      sx={{
        minWidth: 250,
        display: "flex",
        flexDirection: "column",
        borderRight: 1,
        borderColor: "divider",
        bgcolor: isOver ? "action.hover" : "background.default",
        position: "relative",
      }}
    >
      {/* Unscheduled Section */}
      {unscheduledItems.length > 0 && (
        <Box sx={{ p: 1, borderBottom: 1, borderColor: "divider", bgcolor: "action.hover" }}>
          <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: "block" }}>
            Unscheduled
          </Typography>
          <SortableContext items={unscheduledItems.map(i => "city" in i ? i.id : i.saved_id || i.properties.id)} strategy={verticalListSortingStrategy}>
            {unscheduledItems.map((item) => {
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
            })}
          </SortableContext>
        </Box>
      )}

      {/* Time Grid */}
      <Box
        ref={setNodeRef}
        sx={{
          position: "relative",
          height: totalHeight,
          flexGrow: 1,
          overflow: "hidden",
        }}
      >
        {/* Hour lines */}
        {Array.from({ length: 24 }, (_, i) => i).map((hour) => (
          <Box
            key={hour}
            sx={{
              position: "absolute",
              top: hour * hourHeight,
              left: 0,
              right: 0,
              height: hourHeight,
              borderBottom: 1,
              borderColor: "divider",
            }}
          />
        ))}

        {/* Scheduled Items */}
        {scheduledItems.map((posItem) => {
          const itemId = "city" in posItem.item ? posItem.item.id : posItem.item.saved_id || posItem.item.properties.id
          const width = `${100 / posItem.totalColumns}%`
          const left = `${(posItem.column * 100) / posItem.totalColumns}%`

          return (
            <Box
              key={itemId}
              sx={{
                position: "absolute",
                top: posItem.top,
                left,
                width,
                height: Math.max(posItem.height, 30), // Minimum height
                px: 0.5,
                zIndex: 1,
              }}
            >
              <CalendarItem item={posItem.item} onClick={() => onItemClick(posItem.item)} />
            </Box>
          )
        })}
      </Box>
    </Box>
  )
}
