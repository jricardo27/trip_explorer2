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
import { Box, Typography, Paper, Stack } from "@mui/material"
import axios from "axios"
import React, { useState, useEffect, useCallback, useMemo } from "react"

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
const SortableActivityItem = ({ activity, formatTime }: { activity: Activity; formatTime: (d: string) => string }) => {
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
          borderLeftColor: "primary.main",
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
        <Typography variant="subtitle1" fontWeight="bold">
          {activity.name}
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

  const fetchActivities = useCallback(async () => {
    try {
      const response = await axios.get(`/api/trips/${tripId}/activities`)
      setActivities(response.data)
    } catch (err) {
      console.error("Error fetching activities:", err)
    }
  }, [tripId])

  useEffect(() => {
    fetchActivities()
  }, [fetchActivities])

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

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (active.id !== over?.id) {
      setActivities((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id)
        const newIndex = items.findIndex((item) => item.id === over?.id)

        // TODO: Update backend with new order/times
        // For now, just reorder locally
        return arrayMove(items, oldIndex, newIndex)
      })
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
                  <SortableActivityItem key={activity.id} activity={activity} formatTime={formatTime} />
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
