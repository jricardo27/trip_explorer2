import { useState } from "react"
import { useParams } from "react-router-dom"
import { Box, CircularProgress, Typography, Alert, Paper, Grid, Button, IconButton } from "@mui/material"
import { Add as AddIcon } from "@mui/icons-material"
import {
  DndContext,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
} from "@dnd-kit/core"
import type { DragEndEvent } from "@dnd-kit/core"
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from "@dnd-kit/sortable"

import { useTripDetails } from "../hooks/useTripDetails"
import type { Activity } from "../types"
import ActivityDialog from "../components/ActivityDialog"
import { SortableActivityCard } from "../components/SortableActivityCard"
import { useSettingsStore } from "../stores/settingsStore"

const DroppableDay = ({ dayId, children }: { dayId: string; children: React.ReactNode }) => {
  const { setNodeRef } = useDroppable({
    id: dayId,
  })

  return (
    <Box
      ref={setNodeRef}
      sx={{
        minHeight: 100,
        bgcolor: "#fafafa",
        p: 1,
        borderRadius: 1,
        flexGrow: 1,
      }}
    >
      {children}
    </Box>
  )
}

const TripDetailsPage = () => {
  const { tripId } = useParams<{ tripId: string }>()
  const { dateFormat } = useSettingsStore()
  const {
    trip,
    isLoading,
    error,
    createActivity,
    isCreating,
    updateActivity,
    isUpdating,
    deleteActivity,
    isDeleting,
    reorderActivities,
  } = useTripDetails(tripId!)

  // Dialog State
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedDayId, setSelectedDayId] = useState<string | undefined>(undefined)
  const [editingActivity, setEditingActivity] = useState<Activity | undefined>(undefined)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  const handleAddActivity = (dayId?: string) => {
    // Default to the first day if no day is specified (e.g. invalid top button)
    const targetDayId = dayId || trip?.days?.[0]?.id
    setSelectedDayId(targetDayId)
    setEditingActivity(undefined) // Ensure we are in create mode
    setDialogOpen(true)
  }

  const handleEditActivity = (activity: Activity) => {
    setEditingActivity(activity)
    setSelectedDayId(activity.tripDayId)
    setDialogOpen(true)
  }

  const handleDeleteActivity = async (activityId: string) => {
    if (window.confirm("Are you sure you want to delete this activity?")) {
      await deleteActivity(activityId)
    }
  }

  const handleSubmitActivity = async (data: any) => {
    if (data.id) {
      await updateActivity({ id: data.id, data })
    } else {
      await createActivity({
        ...data,
        tripId: tripId!, // Ensure tripId is passed
        tripDayId: selectedDayId, // Ensure dayId is passed if selected
      })
    }
    setDialogOpen(false)
    setEditingActivity(undefined)
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event

    if (!over || !trip?.days) return

    // 1. Find the source day (where the activity is coming from)
    const activeDay = trip.days.find((day) => day.activities?.some((a) => a.id === active.id))

    // 2. Find the destination day
    // It could be that we dropped OVER an activity item
    let overDay = trip.days.find((day) => day.activities?.some((a) => a.id === over.id))
    // OR we dropped OVER the day container itself (handle empty lists)
    if (!overDay) {
      overDay = trip.days.find((day) => day.id === over.id)
    }

    if (!activeDay || !overDay) return

    let updates: { activityId: string; orderIndex: number; tripDayId: string }[] = []

    // Scenario A: Same Day Reordering
    if (activeDay.id === overDay.id && activeDay.activities) {
      if (active.id !== over.id) {
        const oldIndex = activeDay.activities.findIndex((a) => a.id === active.id)
        const newIndex = activeDay.activities.findIndex((a) => a.id === over.id)
        // If dropped on container (over.id === day.id), newIndex might be -1? No, over.id matched activity for this block.
        // If dropped on container, newIndex logic differs.
        // But if activeDay == overDay and matched by activity... it's reorder.

        // Correction: if over is the container, findIndex won't work.
        let finalNewIndex = newIndex
        if (over.id === activeDay.id) {
          // Dropped on itself? Append to end?
          finalNewIndex = activeDay.activities.length - 1
        }

        if (oldIndex !== finalNewIndex) {
          const newOrder = arrayMove(activeDay.activities, oldIndex, finalNewIndex)
          updates = newOrder.map((activity, index) => ({
            activityId: activity.id,
            orderIndex: index,
            tripDayId: activeDay.id,
          }))
        }
      }
    }
    // Scenario B: Cross-Day Moving
    else if (activeDay.id !== overDay.id && activeDay.activities && overDay.activities) {
      const activeItems = [...activeDay.activities]
      const overItems = [...overDay.activities]

      // Remove from source
      const activeIndex = activeItems.findIndex((a) => a.id === active.id)
      const [movedItem] = activeItems.splice(activeIndex, 1)

      // Insert into destination
      let overIndex = overItems.findIndex((a) => a.id === over.id)
      if (over.id === overDay.id) {
        // Dropped on container -> add to end
        overIndex = overItems.length
      } else {
        // Dropped on item -> insert before or after?
        // arrayMove logic usually swaps. Here we just insert.
        // Let's rely on standard splice behavior.
        // If overIndex is -1 (shouldn't be unless container), standard is end.
        if (overIndex === -1) overIndex = overItems.length
      }

      // We need to decide if insert BEFORE or AFTER.
      // dnd-kit `arrayMove` usually targets the index of the `over` item.
      // When moving lists, we insert AT that index.

      overItems.splice(overIndex, 0, { ...movedItem, tripDayId: overDay.id })

      // Generate updates for BOTH lists
      const sourceUpdates = activeItems.map((activity, index) => ({
        activityId: activity.id,
        orderIndex: index,
        tripDayId: activeDay.id,
      }))

      const destUpdates = overItems.map((activity, index) => ({
        activityId: activity.id,
        orderIndex: index,
        tripDayId: overDay!.id,
      }))

      updates = [...sourceUpdates, ...destUpdates]
    }

    // Send updates if any
    if (updates.length > 0) {
      await reorderActivities(updates)
    }
  }

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" mt={4}>
        <CircularProgress />
      </Box>
    )
  }

  if (error || !trip) {
    return (
      <Alert severity="error" sx={{ mt: 2 }}>
        Failed to load trip: {(error as any)?.message || "Unknown error"}
      </Alert>
    )
  }

  return (
    <Box>
      <Paper
        elevation={0}
        sx={{ p: 3, mb: 3, bgcolor: "#f5f5f5", display: "flex", justifyContent: "space-between", alignItems: "center" }}
      >
        <Box>
          <Typography variant="h4" gutterBottom>
            {trip.name}
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            {new Date(trip.startDate).toLocaleDateString(dateFormat)} -{" "}
            {new Date(trip.endDate).toLocaleDateString(dateFormat)}
          </Typography>
          {trip.budget && (
            <Typography variant="body2" sx={{ mt: 1 }}>
              Budget: {trip.defaultCurrency} {trip.budget}
            </Typography>
          )}
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleAddActivity()}>
          Add Activity
        </Button>
      </Paper>

      <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
        <Grid container spacing={2}>
          {trip.days?.map((day) => (
            <Grid size={{ xs: 12, md: 6, lg: 4 }} key={day.id}>
              <Paper sx={{ p: 2, height: "100%", display: "flex", flexDirection: "column" }}>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                  <Box>
                    <Typography variant="h6">{day.name}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {new Date(day.date).toLocaleDateString(dateFormat, {
                        weekday: "long",
                        month: "short",
                        day: "numeric",
                      })}
                    </Typography>
                  </Box>
                  <IconButton size="small" onClick={() => handleAddActivity(day.id)}>
                    <AddIcon fontSize="small" />
                  </IconButton>
                </Box>

                <DroppableDay dayId={day.id}>
                  <SortableContext
                    items={day.activities?.map((a) => a.id) || []}
                    strategy={verticalListSortingStrategy}
                    id={day.id}
                  >
                    {day.activities?.length === 0 ? (
                      <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 4 }}>
                        Drag items here or add new
                      </Typography>
                    ) : (
                      day.activities?.map((activity: Activity) => (
                        <SortableActivityCard
                          key={activity.id}
                          activity={activity}
                          onDelete={handleDeleteActivity}
                          onEdit={handleEditActivity}
                          isDeleting={isDeleting}
                        />
                      ))
                    )}
                  </SortableContext>
                </DroppableDay>
              </Paper>
            </Grid>
          ))}
        </Grid>
      </DndContext>

      {trip && (
        <ActivityDialog
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
          onSubmit={handleSubmitActivity}
          isLoading={isCreating || isUpdating}
          tripId={trip.id}
          tripDayId={selectedDayId}
          activity={editingActivity}
          tripStartDate={trip.startDate}
          tripEndDate={trip.endDate}
          tripDays={trip.days}
        />
      )}
    </Box>
  )
}

export default TripDetailsPage
