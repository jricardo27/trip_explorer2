import { useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { Box, CircularProgress, Typography, Alert, Paper, Grid, Button, IconButton, Tooltip } from "@mui/material"
import { Add as AddIcon, Close as CloseIcon, ExpandMore, ExpandLess, UnfoldLess, UnfoldMore } from "@mui/icons-material"
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
import dayjs from "dayjs"

import { useTripDetails } from "../hooks/useTripDetails"
import type { Activity, TripAnimation } from "../types"
import { TripMembersDialog } from "../components/TripMembersDialog"
import { ExpensesDialog } from "../components/ExpensesDialog"
import { PersonAdd, AttachMoney } from "@mui/icons-material"
import ActivityDialog from "../components/ActivityDialog"
import AnimationConfigDialog from "../components/AnimationConfigDialog"
import { SortableActivityCard } from "../components/SortableActivityCard"
import { TransportSegment } from "../components/Transport/TransportSegment"
import { TripMap } from "../components/TripMap"
import { TripAnimationList } from "../components/TripAnimationList"
import { useSettingsStore } from "../stores/settingsStore"
import client from "../api/client"
import { useQueryClient } from "@tanstack/react-query"

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
  const navigate = useNavigate()
  const queryClient = useQueryClient()
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
    createAnimation,
    deleteAnimation,
  } = useTripDetails(tripId!)

  // Dialog State
  const [dialogOpen, setDialogOpen] = useState(false)
  const [animationDialogOpen, setAnimationDialogOpen] = useState(false)
  const [membersDialogOpen, setMembersDialogOpen] = useState(false)
  const [expensesDialogOpen, setExpensesDialogOpen] = useState(false)
  const [selectedDayId, setSelectedDayId] = useState<string | undefined>(undefined)
  const [editingActivity, setEditingActivity] = useState<Activity | undefined>(undefined)
  const [editingAnimation, setEditingAnimation] = useState<TripAnimation | undefined>(undefined)
  const [activeAnimationId, setActiveAnimationId] = useState<string | undefined>(undefined)
  const [showAnimations, setShowAnimations] = useState(true)

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

  const handleDeleteActivity = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this activity?")) {
      await deleteActivity(id)
    }
  }

  const handleCopyActivity = async (activity: Activity) => {
    try {
      await client.post(`/activities/${activity.id}/copy`)
      // Invalidate query to refetch trip data
      queryClient.invalidateQueries({ queryKey: ["trips", tripId] })
    } catch (error) {
      console.error("Failed to copy activity:", error)
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleSubmitActivity = async (data: any) => {
    if (data.id) {
      await updateActivity({ id: data.id, data })
    } else {
      await createActivity({
        ...data,
        tripId: tripId!, // Ensure tripId is passed
        // Only override tripDayId if it wasn't already set by the dialog's smart assignment
        tripDayId: data.tripDayId || selectedDayId,
      })
    }
    setDialogOpen(false)
    setEditingActivity(undefined)
  }

  const handleMapContextMenu = (latLng: { lat: number; lng: number }) => {
    setEditingActivity({
      latitude: latLng.lat,
      longitude: latLng.lng,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any) // Use cast to populate partial data for creation
    setDialogOpen(true)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleMarkerContextMenu = (feature: any) => {
    const properties = feature.properties
    setEditingActivity({
      name: properties.name || properties.title || properties.label || "New Activity",
      latitude: feature.geometry.coordinates[1],
      longitude: feature.geometry.coordinates[0],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)
    setDialogOpen(true)
  }

  // Fly To Handler
  const [flyToLocation, setFlyToLocation] = useState<{ lat: number; lng: number } | null>(null)
  const handleFlyTo = (activity: Activity) => {
    if (activity.latitude && activity.longitude) {
      setFlyToLocation({ lat: activity.latitude, lng: activity.longitude })
    }
  }

  // Collapse/Expand state for days
  const [collapsedDays, setCollapsedDays] = useState<Set<string>>(new Set())

  const toggleDayCollapse = (dayId: string) => {
    setCollapsedDays((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(dayId)) {
        newSet.delete(dayId)
      } else {
        newSet.add(dayId)
      }
      return newSet
    })
  }

  const collapseAllDays = () => {
    if (trip?.days) {
      setCollapsedDays(new Set(trip.days.map((d) => d.id)))
    }
  }

  const expandAllDays = () => {
    setCollapsedDays(new Set())
  }

  // Editable day names
  const [editingDayId, setEditingDayId] = useState<string | null>(null)
  const [editingDayName, setEditingDayName] = useState("")

  const handleDayNameClick = (day: { id: string; name?: string }) => {
    setEditingDayId(day.id)
    setEditingDayName(day.name || "")
  }

  const handleDayNameSave = async () => {
    if (editingDayId && editingDayName.trim()) {
      try {
        await client.put(`/trips/${tripId}/days/${editingDayId}`, { name: editingDayName.trim() })
        // Invalidate query to refetch trip data
        queryClient.invalidateQueries({ queryKey: ["trips", tripId] })
      } catch (error) {
        console.error("Failed to update day name:", error)
      }
    }
    setEditingDayId(null)
    setEditingDayName("")
  }

  const handleDayNameCancel = () => {
    setEditingDayId(null)
    setEditingDayName("")
  }

  const handleDayNameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleDayNameSave()
    } else if (e.key === "Escape") {
      handleDayNameCancel()
    }
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

      // Determine date shift and trigger update for the moved item
      if (movedItem && (movedItem.scheduledStart || movedItem.scheduledEnd)) {
        const sourceDate = dayjs(activeDay.date)
        const destDate = dayjs(overDay.date)
        const diffMs = destDate.diff(sourceDate)

        const newStart = movedItem.scheduledStart
          ? dayjs(movedItem.scheduledStart).add(diffMs, "ms").toISOString()
          : undefined
        const newEnd = movedItem.scheduledEnd
          ? dayjs(movedItem.scheduledEnd).add(diffMs, "ms").toISOString()
          : undefined

        // Fire and forget update (or await if critical, but reorder is separate)
        updateActivity({
          id: movedItem.id,
          data: {
            scheduledStart: newStart,
            scheduledEnd: newEnd,
          },
        })
      }
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
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        Failed to load trip: {(error as any)?.message || "Unknown error"}
      </Alert>
    )
  }

  return (
    <Box>
      <Paper
        elevation={0}
        sx={{
          p: 1.5,
          mb: 1,
          bgcolor: "#f5f5f5",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 2,
        }}
      >
        <Box display="flex" alignItems="center" gap={2} flexWrap="wrap">
          <Button
            startIcon={<CloseIcon />}
            onClick={() => navigate("/trips")}
            color="inherit"
            size="small"
            sx={{ minWidth: "auto" }}
          >
            Close
          </Button>
          <Box>
            <Box display="flex" alignItems="baseline" gap={2}>
              <Typography variant="h5" sx={{ fontWeight: "bold" }}>
                {trip.name}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {new Date(trip.startDate).toLocaleDateString(dateFormat)} -{" "}
                {new Date(trip.endDate).toLocaleDateString(dateFormat)}
              </Typography>
            </Box>
            {trip.budget && (
              <Typography variant="caption" color="text.secondary">
                Budget: {trip.defaultCurrency} {trip.budget}
              </Typography>
            )}
          </Box>
        </Box>
        <Box sx={{ display: "flex", gap: 1 }}>
          <Button variant="outlined" size="small" startIcon={<PersonAdd />} onClick={() => setMembersDialogOpen(true)}>
            Members
          </Button>
          <Button
            variant="outlined"
            size="small"
            startIcon={<AttachMoney />}
            onClick={() => setExpensesDialogOpen(true)}
          >
            Expenses
          </Button>
          {!trip.isCompleted && (
            <Button
              variant="contained"
              size="small"
              startIcon={<AddIcon />}
              onClick={() => {
                setEditingActivity(undefined)
                setDialogOpen(true)
              }}
            >
              Add Activity
            </Button>
          )}
        </Box>

        <Box display="flex" gap={1}>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleAddActivity()} size="small">
            Add Activity
          </Button>
          <Button variant="outlined" onClick={() => setAnimationDialogOpen(true)} size="small">
            Animation
          </Button>
        </Box>
      </Paper>

      <Box display="flex" gap={2} sx={{ height: "calc(100vh - 180px)" }}>
        {/* Fixed Map Panel */}
        <Box sx={{ flex: "1 1 50%", display: "flex", flexDirection: "column", pr: 1 }}>
          <Box sx={{ flexGrow: 1, minHeight: 0 }}>
            {trip && (
              <TripMap
                activities={trip.activities}
                selectedActivityId={editingActivity?.id}
                animations={trip.animations}
                days={trip.days}
                activeAnimationId={activeAnimationId}
                onMapContextMenu={handleMapContextMenu}
                onMarkerContextMenu={handleMarkerContextMenu}
                activeFlyToLocation={flyToLocation}
              />
            )}
          </Box>

          {/* Trip Animations List - Under Map */}
          {trip && (
            <Box sx={{ mt: 2 }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
                <Typography variant="h6" sx={{ fontSize: "1rem" }}>
                  Animations
                </Typography>
                <IconButton
                  size="small"
                  onClick={() => setShowAnimations(!showAnimations)}
                  title={showAnimations ? "Hide animations" : "Show animations"}
                >
                  {showAnimations ? <ExpandLess /> : <ExpandMore />}
                </IconButton>
              </Box>
              {showAnimations && (
                <TripAnimationList
                  animations={trip.animations || []}
                  onPlay={(animation) => {
                    setActiveAnimationId(animation.id)
                  }}
                  onEdit={(animation) => {
                    setEditingAnimation(animation)
                    setAnimationDialogOpen(true)
                  }}
                  onDelete={(id) => deleteAnimation(id)}
                  onCreate={() => {
                    setEditingAnimation(undefined)
                    setAnimationDialogOpen(true)
                  }}
                />
              )}
            </Box>
          )}
        </Box>

        {/* Scrollable Trip Days Panel */}
        <Box sx={{ flex: "1 1 50%", overflowY: "auto", pr: 1 }}>
          {/* Collapse/Expand Controls */}
          <Box
            sx={{
              display: "flex",
              justifyContent: "flex-end",
              gap: 1,
              mb: 2,
              position: "sticky",
              top: 0,
              bgcolor: "background.default",
              zIndex: 1,
              pb: 1,
            }}
          >
            <Button size="small" startIcon={<UnfoldLess />} onClick={collapseAllDays} variant="outlined">
              Collapse All
            </Button>
            <Button size="small" startIcon={<UnfoldMore />} onClick={expandAllDays} variant="outlined">
              Expand All
            </Button>
          </Box>

          <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
            <Grid container spacing={2}>
              {trip.days?.map((day) => {
                const isCollapsed = collapsedDays.has(day.id)

                return (
                  <Grid key={day.id} size={{ xs: 12 }}>
                    <Paper sx={{ p: 2, height: "100%", display: "flex", flexDirection: "column" }}>
                      <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                        <Box display="flex" alignItems="center" gap={1} flex={1}>
                          <Tooltip title={isCollapsed ? "Expand day" : "Collapse day"}>
                            <IconButton size="small" onClick={() => toggleDayCollapse(day.id)} sx={{ p: 0.5 }}>
                              {isCollapsed ? <ExpandMore /> : <ExpandLess />}
                            </IconButton>
                          </Tooltip>
                          <Box>
                            {editingDayId === day.id ? (
                              <input
                                type="text"
                                value={editingDayName}
                                onChange={(e) => setEditingDayName(e.target.value)}
                                onBlur={handleDayNameSave}
                                onKeyDown={handleDayNameKeyDown}
                                autoFocus
                                style={{
                                  fontSize: "1.25rem",
                                  fontWeight: 500,
                                  border: "1px solid #1976d2",
                                  borderRadius: "4px",
                                  padding: "2px 6px",
                                  outline: "none",
                                  width: "200px",
                                }}
                              />
                            ) : (
                              <Typography
                                variant="h6"
                                onClick={() => handleDayNameClick(day)}
                                sx={{
                                  cursor: "pointer",
                                  "&:hover": {
                                    textDecoration: "underline",
                                    color: "primary.main",
                                  },
                                }}
                              >
                                {day.name}
                              </Typography>
                            )}
                            <Typography variant="caption" color="text.secondary">
                              {new Date(day.date).toLocaleDateString(dateFormat, {
                                weekday: "long",
                                month: "short",
                                day: "numeric",
                              })}
                            </Typography>
                          </Box>
                        </Box>
                        <Tooltip title="Add activity to this day">
                          <IconButton size="small" onClick={() => handleAddActivity(day.id)}>
                            <AddIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>

                      {!isCollapsed && (
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
                              day.activities?.map((activity: Activity, index: number) => {
                                let nextActivity = day.activities?.[index + 1]

                                // Check for cross-day transport (next activity is first of next day)
                                if (!nextActivity) {
                                  const currentDayIndex = trip.days?.findIndex((d) => d.id === day.id) ?? -1
                                  if (currentDayIndex !== -1 && trip.days && currentDayIndex < trip.days.length - 1) {
                                    const nextDay = trip.days[currentDayIndex + 1]
                                    if (nextDay.activities && nextDay.activities.length > 0) {
                                      nextActivity = nextDay.activities[0]
                                    }
                                  }
                                }

                                const transportOptions =
                                  trip.transport?.filter(
                                    (t) => t.fromActivityId === activity.id && t.toActivityId === nextActivity?.id,
                                  ) || []

                                return (
                                  <div key={activity.id}>
                                    <SortableActivityCard
                                      activity={activity}
                                      onDelete={handleDeleteActivity}
                                      onEdit={handleEditActivity}
                                      onCopy={handleCopyActivity}
                                      isDeleting={isDeleting}
                                      onFlyTo={handleFlyTo}
                                    />
                                    {nextActivity && (
                                      <TransportSegment
                                        tripId={trip.id}
                                        fromActivityId={activity.id}
                                        toActivityId={nextActivity.id}
                                        alternatives={transportOptions}
                                      />
                                    )}
                                  </div>
                                )
                              })
                            )}
                          </SortableContext>
                        </DroppableDay>
                      )}
                    </Paper>
                  </Grid>
                )
              })}
            </Grid>
          </DndContext>
        </Box>
      </Box>

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

      {trip && (
        <AnimationConfigDialog
          open={animationDialogOpen}
          onClose={() => {
            setAnimationDialogOpen(false)
            setEditingAnimation(undefined)
          }}
          trip={trip}
          initialData={
            editingAnimation
              ? {
                  ...editingAnimation,
                  steps: editingAnimation.steps.map((s) => ({
                    ...s,
                    activityId: s.activityId || "", // Ensure activityId is string
                  })),
                }
              : undefined
          }
          onSubmit={createAnimation}
        />
      )}

      {trip && <TripMembersDialog open={membersDialogOpen} onClose={() => setMembersDialogOpen(false)} trip={trip} />}

      {trip && (
        <ExpensesDialog
          open={expensesDialogOpen}
          onClose={() => setExpensesDialogOpen(false)}
          tripId={trip.id}
          currency={trip.defaultCurrency || "AUD"}
        />
      )}
    </Box>
  )
}

export default TripDetailsPage
