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
import axios from "axios"
import React, { useState, useEffect, useCallback, useMemo } from "react"

import { useTripContext, Conflict } from "../../contexts/TripContext"

interface Activity {
  id: string
  name: string
  scheduled_start: string
  scheduled_end: string | null
  location_coords?: unknown
  activity_type: string
  latitude?: number
  longitude?: number
}

interface TimelineViewProps {
  tripId: string
}

// Sortable Item Component
const SortableActivityItem = ({
  activity,
  formatTime,
  conflict,
}: {
  activity: Activity
  formatTime: (d: string) => string
  conflict?: Conflict
}) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: activity.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

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
          {activity.name}
          {conflict && (
            <Tooltip
              title={`Conflict with ${
                conflict.activity1_id === activity.id ? conflict.activity2_name : conflict.activity1_name
              }`}
              arrow
            >
              <WarningIcon color="error" fontSize="small" />
            </Tooltip>
          )}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {formatTime(activity.scheduled_start)}
          {activity.scheduled_end && ` - ${formatTime(activity.scheduled_end)}`}
        </Typography>
        {(activity.latitude || activity.longitude) && (
          <Typography variant="body2" color="text.secondary">
            📍 Location: {activity.latitude?.toFixed(4)}, {activity.longitude?.toFixed(4)}
          </Typography>
        )}
      </Paper>
    </div>
  )
}

const TimelineView: React.FC<TimelineViewProps> = ({ tripId }) => {
  const [activities, setActivities] = useState<Activity[]>([])
  const [conflicts, setConflicts] = useState<Conflict[]>([])

  const { fetchConflicts } = useTripContext()

  const fetchActivities = useCallback(async () => {
    try {
      const response = await axios.get(`/api/trips/${tripId}/activities`)
      setActivities(response.data)
    } catch (err) {
      console.error("Error fetching activities:", err)
    }
  }, [tripId])

  const loadConflicts = useCallback(async () => {
    const data = await fetchConflicts(tripId)
    setConflicts(data)
  }, [tripId, fetchConflicts])

  useEffect(() => {
    fetchActivities()
    loadConflicts()
  }, [fetchActivities, loadConflicts])

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
    return new Date(dateStr).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString([], {
      weekday: "short",
      month: "short",
      day: "numeric",
    })
  }

  // Group activities by date
  const groupedActivities = useMemo(() => {
    return activities.reduce(
      (acc, activity) => {
        if (!activity.scheduled_start) return acc
        const date = new Date(activity.scheduled_start).toDateString()
        if (!acc[date]) {
          acc[date] = []
        }
        acc[date].push(activity)
        return acc
      },
      {} as Record<string, Activity[]>,
    )
  }, [activities])

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event

    if (!over || active.id === over.id) return

    // Find the active item and over item
    const activeId = active.id as string
    const overId = over.id as string

    // Find which day group these belong to
    // Note: This simple implementation assumes dragging within the same day for now
    // Cross-day dragging would require finding source and destination containers
    let activeDay: string | undefined
    let activeActivity: Activity | undefined

    Object.entries(groupedActivities).forEach(([date, items]) => {
      const found = items.find((a) => a.id === activeId)
      if (found) {
        activeDay = date
        activeActivity = found
      }
    })

    if (!activeDay || !activeActivity) return

    const dayActivities = groupedActivities[activeDay]
    const oldIndex = dayActivities.findIndex((item) => item.id === activeId)
    const newIndex = dayActivities.findIndex((item) => item.id === overId)

    if (oldIndex === -1 || newIndex === -1) return

    // Calculate new order locally for optimistic update
    const newOrder = arrayMove(dayActivities, oldIndex, newIndex)

    // Calculate new time based on position
    // If moved to index i, it should start after i-1 (or day start)
    // and before i+1 (if exists)

    const prevActivity = newIndex > 0 ? newOrder[newIndex - 1] : null
    // const nextActivity = newIndex < newOrder.length - 1 ? newOrder[newIndex + 1] : null

    let newStartTime = new Date(activeActivity.scheduled_start)
    const durationMs = activeActivity.scheduled_end
      ? new Date(activeActivity.scheduled_end).getTime() - new Date(activeActivity.scheduled_start).getTime()
      : 60 * 60 * 1000 // Default 1 hour if no end time

    if (prevActivity && prevActivity.scheduled_end) {
      // Start 15 mins after previous activity ends
      const prevEnd = new Date(prevActivity.scheduled_end).getTime()
      newStartTime = new Date(prevEnd + 15 * 60 * 1000)
    } else if (prevActivity) {
      // Start 1 hour after previous activity starts (if no end time)
      const prevStart = new Date(prevActivity.scheduled_start).getTime()
      newStartTime = new Date(prevStart + 60 * 60 * 1000)
    } else {
      // First item in list - keep same day but set to 09:00 or keep current time if earlier?
      // For simplicity, let's keep the date but set time to 09:00 if it was later,
      // or just subtract 1 hour from original?
      // Let's set to 09:00 of that day
      newStartTime.setHours(9, 0, 0, 0)
    }

    const newEndTime = new Date(newStartTime.getTime() + durationMs)

    // Optimistic update
    const updatedActivity = {
      ...activeActivity,
      scheduled_start: newStartTime.toISOString(),
      scheduled_end: newEndTime.toISOString(),
    }

    const updatedActivities = activities.map((a) => (a.id === activeId ? updatedActivity : a))
    setActivities(updatedActivities)

    // Backend update
    try {
      await axios.put(`/api/activities/${activeId}`, {
        scheduled_start: newStartTime.toISOString(),
        scheduled_end: newEndTime.toISOString(),
      })
      // Refresh to ensure sync
      fetchActivities()
    } catch (error) {
      console.error("Failed to update activity time:", error)
      // Revert on error
      fetchActivities()
    }
  }

  if (activities.length === 0) {
    return (
      <Box sx={{ p: 3, textAlign: "center" }}>
        <Typography color="text.secondary">No activities found for this trip.</Typography>
      </Box>
    )
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <Box>
        {Object.entries(groupedActivities).map(([date, dayActivities]) => (
          <Box key={date} sx={{ mb: 4 }}>
            <Typography variant="h6" sx={{ mb: 2, color: "primary.main" }}>
              {formatDate(dayActivities[0].scheduled_start)}
            </Typography>
            <SortableContext items={dayActivities.map((a) => a.id)} strategy={verticalListSortingStrategy}>
              <Stack spacing={2}>
                {dayActivities.map((activity) => (
                  <SortableActivityItem
                    key={activity.id}
                    activity={activity}
                    formatTime={formatTime}
                    conflict={getConflictForActivity(activity.id)}
                  />
                ))}
              </Stack>
            </SortableContext>
          </Box>
        ))}
      </Box>
    </DndContext>
  )
}

export default TimelineView
