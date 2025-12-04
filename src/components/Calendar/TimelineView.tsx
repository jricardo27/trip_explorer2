import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core"
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import WarningIcon from "@mui/icons-material/Warning"
import { Box, Typography, Paper, Stack, Tooltip } from "@mui/material"
import React, { useMemo } from "react"

import { useTripContext, Conflict, DayLocation, TripFeature } from "../../contexts/TripContext"

interface TimelineViewProps {
  tripId: string
}

// Sortable Item Component
const SortableActivityItem = ({
  item,
  formatTime,
  conflict,
  onEdit,
}: {
  item: DayLocation | TripFeature
  formatTime: (d: string) => string
  conflict?: Conflict
  onEdit: (item: DayLocation | TripFeature) => void
}) => {
  const isFeature = "type" in item && item.type === "Feature"
  const id = isFeature
    ? (item as TripFeature).saved_id || (item as TripFeature).properties.id
    : (item as DayLocation).id
  const name = isFeature
    ? (item as TripFeature).properties.title || (item as TripFeature).properties.name || "Untitled Feature"
    : (item as DayLocation).city

  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const startTime = item.start_time
  const endTime = item.end_time
  const latitude = isFeature ? (item as TripFeature).geometry.coordinates[1] : (item as DayLocation).latitude
  const longitude = isFeature ? (item as TripFeature).geometry.coordinates[0] : (item as DayLocation).longitude

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <Paper
        sx={{
          p: 2,
          ml: 4,
          borderLeft: "4px solid",
          borderLeftColor: conflict ? "error.main" : "primary.main",
          position: "relative",
          cursor: "grab",
          "&:active": { cursor: "grabbing" },
        }}
        onClick={() => onEdit(item)}
      >
        <Box
          sx={{
            position: "absolute",
            left: -12,
            top: "50%",
            transform: "translateY(-50%)",
            width: 20,
            height: 20,
            borderRadius: "50%",
            bgcolor: "primary.main",
            border: "3px solid white",
          }}
        />
        <Typography variant="subtitle1" fontWeight="bold" sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          {name}
          {conflict && (
            <Tooltip
              title={`Conflict with ${
                conflict.activity1_id === id ? conflict.activity2_name : conflict.activity1_name
              }`}
              arrow
            >
              <WarningIcon color="error" fontSize="small" />
            </Tooltip>
          )}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {startTime ? formatTime(startTime) : "Unscheduled"}
          {endTime && ` - ${formatTime(endTime)}`}
        </Typography>
        {(latitude || longitude) && (
          <Typography variant="body2" color="text.secondary">
            📍 Location: {latitude?.toFixed(4)}, {longitude?.toFixed(4)}
          </Typography>
        )}
      </Paper>
    </div>
  )
}

const TimelineView: React.FC<TimelineViewProps> = ({ tripId }) => {
  const { currentTrip, dayLocations, dayFeatures, conflicts, updateLocation, updateFeature, fetchConflicts } =
    useTripContext()

  // Fetch conflicts when component mounts or tripId changes
  React.useEffect(() => {
    fetchConflicts(tripId)
  }, [tripId, fetchConflicts])

  const getConflictForActivity = (activityId: string) => {
    return conflicts.find((c) => c.activity1_id === activityId || c.activity2_id === activityId)
  }

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr)
    if (isNaN(date.getTime())) return "Invalid Time"
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString([], {
      weekday: "short",
      month: "short",
      day: "numeric",
    })
  }

  // Group items by day
  const groupedItems = useMemo(() => {
    if (!currentTrip?.days) return {}

    const groups: Record<string, (DayLocation | TripFeature)[]> = {}

    currentTrip.days.forEach((day) => {
      const date = day.date
      groups[date] = []

      // Add locations for this day
      const locs = dayLocations[day.id] || []
      groups[date].push(...locs)

      // Add features for this day
      const feats = dayFeatures[day.id] || []
      groups[date].push(...feats)

      // Sort by start time or visit order
      groups[date].sort((a, b) => {
        const timeA = a.start_time ? new Date(a.start_time).getTime() : 0
        const timeB = b.start_time ? new Date(b.start_time).getTime() : 0
        if (timeA !== timeB) return timeA - timeB
        return (a.visit_order || 0) - (b.visit_order || 0)
      })
    })

    return groups
  }, [currentTrip, dayLocations, dayFeatures])

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event

    if (!over || active.id === over.id) return

    const activeId = active.id as string
    const overId = over.id as string

    // Find active item and its day
    let activeDayDate: string | undefined
    let activeItem: DayLocation | TripFeature | undefined

    Object.entries(groupedItems).forEach(([date, items]) => {
      const found = items.find((item) => {
        const itemId =
          "type" in item && item.type === "Feature"
            ? (item as TripFeature).saved_id || (item as TripFeature).properties.id
            : (item as DayLocation).id
        return itemId === activeId
      })
      if (found) {
        activeDayDate = date
        activeItem = found
      }
    })

    if (!activeDayDate || !activeItem) return

    const dayItems = groupedItems[activeDayDate]
    const oldIndex = dayItems.findIndex((item) => {
      const itemId =
        "type" in item && item.type === "Feature"
          ? (item as TripFeature).saved_id || (item as TripFeature).properties.id
          : (item as DayLocation).id
      return itemId === activeId
    })
    const newIndex = dayItems.findIndex((item) => {
      const itemId =
        "type" in item && item.type === "Feature"
          ? (item as TripFeature).saved_id || (item as TripFeature).properties.id
          : (item as DayLocation).id
      return itemId === overId
    })

    if (oldIndex === -1 || newIndex === -1) return

    // But we need the array AFTER move to know the new previous item.
    const newOrder = arrayMove(dayItems, oldIndex, newIndex)
    // Calculate new time
    const prevItem = newIndex > 0 ? newOrder[newIndex - 1] : null

    let newStartTime = new Date(activeDayDate) // Default to day start (00:00)
    // Set to 9 AM default if no prev item
    newStartTime.setHours(9, 0, 0, 0)

    if (activeItem.start_time) {
      // Keep original time components if just reordering? No, drag usually implies rescheduling in timeline.
      // But if we drag to reorder, we probably want to adjust time.
    }

    if (prevItem && prevItem.end_time) {
      const prevEnd = new Date(prevItem.end_time).getTime()
      newStartTime = new Date(prevEnd + 15 * 60 * 1000) // +15 mins
    } else if (prevItem && prevItem.start_time) {
      const prevStart = new Date(prevItem.start_time).getTime()
      newStartTime = new Date(prevStart + 60 * 60 * 1000) // +1 hour
    }

    // Calculate duration
    let durationMs = 60 * 60 * 1000 // 1 hour default
    if (activeItem.start_time && activeItem.end_time) {
      durationMs = new Date(activeItem.end_time).getTime() - new Date(activeItem.start_time).getTime()
    }

    const newEndTime = new Date(newStartTime.getTime() + durationMs)

    // Update item
    const isFeature = "type" in activeItem && activeItem.type === "Feature"
    const dayId = activeItem.trip_day_id || "" // Should exist

    try {
      if (isFeature) {
        await updateFeature(activeId, dayId, {
          start_time: newStartTime.toISOString(),
          end_time: newEndTime.toISOString(),
          visit_order: newIndex, // Update order too
        })
      } else {
        await updateLocation(activeId, dayId, {
          start_time: newStartTime.toISOString(),
          end_time: newEndTime.toISOString(),
          visit_order: newIndex,
        })
      }
    } catch (error) {
      console.error("Failed to update item:", error)
    }
  }

  if (!currentTrip || !currentTrip.days || currentTrip.days.length === 0) {
    return (
      <Box sx={{ p: 3, textAlign: "center" }}>
        <Typography color="text.secondary">No activities found for this trip.</Typography>
      </Box>
    )
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <Box>
        {Object.entries(groupedItems).map(([date, items]) => (
          <Box key={date} sx={{ mb: 4 }}>
            <Typography variant="h6" sx={{ mb: 2, color: "primary.main" }}>
              {formatDate(date)}
            </Typography>
            <SortableContext
              items={items.map((i) =>
                "type" in i && i.type === "Feature"
                  ? (i as TripFeature).saved_id || (i as TripFeature).properties.id
                  : (i as DayLocation).id,
              )}
              strategy={verticalListSortingStrategy}
            >
              <Stack spacing={2}>
                {items.map((item) => {
                  const id =
                    "type" in item && item.type === "Feature"
                      ? (item as TripFeature).saved_id || (item as TripFeature).properties.id
                      : (item as DayLocation).id
                  return (
                    <SortableActivityItem
                      key={id}
                      item={item}
                      formatTime={formatTime}
                      conflict={getConflictForActivity(id)}
                      onEdit={(item) => console.log("Edit item:", item)}
                    />
                  )
                })}
              </Stack>
            </SortableContext>
          </Box>
        ))}
      </Box>
    </DndContext>
  )
}

export default TimelineView
