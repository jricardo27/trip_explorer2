import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, closestCenter } from "@dnd-kit/core"
import { Box, Typography, Paper, IconButton, Chip } from "@mui/material"
import React, { useState, useMemo } from "react"
import { MdEdit, MdDelete, MdLocationOn, MdPlace } from "react-icons/md"

import { TripDay, DayLocation, TripFeature, useTripContext } from "../../contexts/TripContext"

interface DayGridViewProps {
  day: TripDay
  locations: DayLocation[]
  features: TripFeature[]
  onEditItem?: (item: DayLocation | TripFeature) => void
  onDeleteItem?: (item: DayLocation | TripFeature, dayId: string) => void
}

const HOUR_HEIGHT = 80 // pixels per hour
const START_HOUR = 0
const END_HOUR = 24

const timeToMinutes = (time: string): number => {
  if (time.includes("T")) {
    const date = new Date(time)
    return date.getHours() * 60 + date.getMinutes()
  }
  const [hours, minutes] = time.split(":").map(Number)
  return hours * 60 + minutes
}

const minutesToPixels = (minutes: number): number => {
  return (minutes / 60) * HOUR_HEIGHT
}

const DayGridView: React.FC<DayGridViewProps> = ({ day, locations, features, onEditItem, onDeleteItem }) => {
  const { updateLocation, updateFeature } = useTripContext()
  const [draggedItem, setDraggedItem] = useState<DayLocation | TripFeature | null>(null)

  const { scheduledItems, unscheduledItems } = useMemo(() => {
    const allItems = [
      ...locations.map((l) => ({ ...l, type: "location" as const })),
      ...features.map((f) => ({ ...f, type: "Feature" as const })),
    ]

    const scheduled: Array<{ item: DayLocation | TripFeature; top: number; height: number }> = []
    const unscheduled: Array<DayLocation | TripFeature> = []

    allItems.forEach((item) => {
      if (item.start_time) {
        const startMinutes = timeToMinutes(item.start_time)
        const duration = item.duration_minutes || 60
        scheduled.push({
          item,
          top: minutesToPixels(startMinutes),
          height: minutesToPixels(duration),
        })
      } else {
        unscheduled.push(item)
      }
    })

    return { scheduledItems: scheduled, unscheduledItems: unscheduled }
  }, [locations, features])

  const handleDragStart = (event: DragStartEvent) => {
    const item = event.active.data.current?.item
    if (item) {
      setDraggedItem(item)
    }
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    setDraggedItem(null)

    if (!event.active || !event.active.data.current?.item) return

    const item = event.active.data.current.item

    // Get the container element to calculate relative position
    const container = document.querySelector("[data-day-grid]")
    if (!container) return

    const containerRect = container.getBoundingClientRect()

    // Calculate the drop position relative to the container
    // event.active.rect.current.translated gives us the final position
    // If dropping from outside (unscheduled), we need to use the drop coordinates
    // event.over?.rect might be useful if we had droppable zones for hours, but we just use the grid container

    // We need the Y coordinate of the mouse/touch relative to the grid container
    // Dnd-kit doesn't give mouse coordinates directly in DragEndEvent easily without sensors or modifiers
    // But we can use the translated rect of the active item

    const dropRect = event.active.rect.current.translated
    if (!dropRect) return

    // Check if dropped within the grid bounds (roughly)
    // If the drop is completely outside the grid vertical range, maybe we shouldn't schedule it?
    // But let's assume if they drop it near the grid, they want to schedule it.

    // Calculate relative Y
    const relativeY = dropRect.top - containerRect.top

    // Convert Y position to time
    const newMinutes = Math.max(0, Math.min(24 * 60, (relativeY / HOUR_HEIGHT) * 60))
    const newHours = Math.floor(newMinutes / 60)
    const newMins = Math.floor(newMinutes % 60)
    const newTime = `${String(newHours).padStart(2, "0")}:${String(newMins).padStart(2, "0")}`

    // Only update if the time actually changed or if it was unscheduled
    if (item.start_time !== newTime) {
      const isLocation = "city" in item
      if (isLocation) {
        await updateLocation(item.id, item.trip_day_id, { start_time: newTime })
      } else {
        const featureId = item.saved_id || item.properties.id
        await updateFeature(featureId, item.trip_day_id, { start_time: newTime })
      }
    }
  }

  const renderActivityCard = (item: DayLocation | TripFeature, isDragging = false, top?: number) => {
    const isLocation = "city" in item
    const name = isLocation ? item.city : item.properties.title || item.properties.name || "Untitled"
    const id = isLocation ? item.id : item.saved_id || item.properties.id

    return (
      <Paper
        elevation={isDragging ? 4 : 1}
        sx={{
          p: 1,
          cursor: "move",
          opacity: isDragging ? 0.5 : 1,
          borderLeft: 4,
          borderLeftColor: "primary.main",
          "&:hover .actions": { opacity: 1 },
        }}
        data-item-id={id}
        data-top={top}
      >
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexGrow: 1, minWidth: 0 }}>
            {isLocation ? <MdLocationOn size={16} /> : <MdPlace size={16} />}
            <Typography variant="body2" fontWeight="medium" noWrap>
              {name}
            </Typography>
            {item.transport_mode && (
              <Chip
                label={item.transport_mode}
                size="small"
                sx={{ height: 18, fontSize: "0.65rem", textTransform: "capitalize" }}
              />
            )}
          </Box>
          <Box className="actions" sx={{ opacity: 0, transition: "opacity 0.2s", display: "flex" }}>
            <IconButton size="small" onClick={() => onEditItem?.(item)}>
              <MdEdit fontSize="small" />
            </IconButton>
            <IconButton size="small" onClick={() => onDeleteItem?.(item, day.id)}>
              <MdDelete fontSize="small" />
            </IconButton>
          </Box>
        </Box>
        {item.start_time && (
          <Typography variant="caption" color="text.secondary">
            {item.start_time.slice(0, 5)}
            {item.duration_minutes && ` (${item.duration_minutes}min)`}
          </Typography>
        )}
      </Paper>
    )
  }

  return (
    <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd} collisionDetection={closestCenter}>
      <Box sx={{ height: "100%", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Header */}
        <Paper elevation={1} sx={{ p: 2, borderRadius: 0 }}>
          <Typography variant="h6" fontWeight="bold">
            Day {day.day_index + 1}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {new Date(day.date).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
          </Typography>
        </Paper>

        {/* Unscheduled Items */}
        {unscheduledItems.length > 0 && (
          <Paper sx={{ p: 2, bgcolor: "action.hover", borderRadius: 0 }}>
            <Typography variant="subtitle2" gutterBottom>
              Unscheduled Activities
            </Typography>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
              {unscheduledItems.map((item) => {
                const id = "city" in item ? item.id : item.saved_id || item.properties.id
                return <Box key={id}>{renderActivityCard(item)}</Box>
              })}
            </Box>
          </Paper>
        )}

        {/* Time Grid */}
        <Box sx={{ flexGrow: 1, overflowY: "auto", position: "relative", display: "flex" }}>
          {/* Time Labels */}
          <Box sx={{ width: 60, flexShrink: 0, borderRight: 1, borderColor: "divider", bgcolor: "background.paper" }}>
            {Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i).map((hour) => (
              <Box
                key={hour}
                sx={{
                  height: HOUR_HEIGHT,
                  borderBottom: 1,
                  borderColor: "divider",
                  display: "flex",
                  alignItems: "flex-start",
                  px: 1,
                  py: 0.5,
                }}
              >
                <Typography variant="caption" color="text.secondary">
                  {String(hour).padStart(2, "0")}:00
                </Typography>
              </Box>
            ))}
          </Box>

          {/* Activity Grid */}
          <Box
            data-day-grid
            sx={{ flexGrow: 1, position: "relative", minHeight: HOUR_HEIGHT * (END_HOUR - START_HOUR) }}
          >
            {/* Hour Lines */}
            {Array.from({ length: END_HOUR - START_HOUR }, (_, i) => i).map((hour) => (
              <Box
                key={hour}
                sx={{
                  position: "absolute",
                  top: hour * HOUR_HEIGHT,
                  left: 0,
                  right: 0,
                  height: HOUR_HEIGHT,
                  borderBottom: 1,
                  borderColor: "divider",
                }}
              />
            ))}

            {/* Scheduled Activities */}
            {scheduledItems.map(({ item, top, height }) => {
              const id = "city" in item ? item.id : item.saved_id || item.properties.id
              return (
                <Box
                  key={id}
                  sx={{
                    position: "absolute",
                    top,
                    left: 8,
                    right: 8,
                    minHeight: Math.max(height, 40),
                    zIndex: 1,
                  }}
                  data-item-top={top}
                >
                  {renderActivityCard(item, false, top)}
                </Box>
              )
            })}
          </Box>
        </Box>

        {/* Drag Overlay */}
        <DragOverlay>{draggedItem ? renderActivityCard(draggedItem, true) : null}</DragOverlay>
      </Box>
    </DndContext>
  )
}

export default DayGridView
