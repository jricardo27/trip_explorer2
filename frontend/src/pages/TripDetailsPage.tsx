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
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, arrayMove } from "@dnd-kit/sortable"
import {
  Add as AddIcon,
  ExpandMore,
  ExpandLess,
  Timeline as TimelineIcon,
  List as ListIcon,
  Assessment as ExpenseIcon,
  PlaylistAddCheck as PrepIcon,
  ArrowBack as BackIcon,
  Settings as SettingsIcon,
  People as PeopleIcon,
  Print as PrintIcon,
  Book as JournalIcon,
  Movie as AnimationIcon,
} from "@mui/icons-material"
import {
  Box,
  CircularProgress,
  Typography,
  Alert,
  Paper,
  Grid,
  Button,
  IconButton,
  useMediaQuery,
  useTheme,
  Tabs,
  Tab,
  Chip,
  Collapse,
  Tooltip,
} from "@mui/material"
import { useQueryClient } from "@tanstack/react-query"
import dayjs from "dayjs"
import React, { useState } from "react"
import { useNavigate, useParams } from "react-router-dom"

import client from "../api/client"
import ActivityDialog from "../components/ActivityDialog"
import { ExpensesDialog } from "../components/ExpensesDialog"
import { ExpensesPanel } from "../components/ExpensesPanel"
import { JournalPanel } from "../components/JournalPanel"
import { PreparationTab } from "../components/PreparationTab"
import { SortableActivityCard } from "../components/SortableActivityCard"
import { TimelineCalendarView } from "../components/TimelineCalendarView"
import { TransportDialog } from "../components/Transport/TransportDialog"
import { TransportSegment } from "../components/Transport/TransportSegment"
import { TripMap } from "../components/TripMap"
import { TripMembersDialog } from "../components/TripMembersDialog"
import { TripSettingsDialog } from "../components/TripSettingsDialog"
import { useTripDetails } from "../hooks/useTripDetails"
import type { Activity } from "../types"

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
  const { trip, isLoading, error, createActivity, updateActivity, deleteActivity, updateTrip, reorderActivities } =
    useTripDetails(tripId!)

  // UI State
  const [viewMode, setViewMode] = useState<"list" | "animation" | "timeline" | "prep" | "expenses" | "journal">("list")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [membersDialogOpen, setMembersDialogOpen] = useState(false)
  const [expensesDialogOpen, setExpensesDialogOpen] = useState(false)
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false)
  const [selectedDayId, setSelectedDayId] = useState<string | undefined>(undefined)
  const [editingActivity, setEditingActivity] = useState<Activity | undefined>(undefined)
  const [collapsedDays, setCollapsedDays] = useState<Set<string>>(new Set())
  const [activeFlyToLocation, setActiveFlyToLocation] = useState<{ lat: number; lng: number; _ts?: number } | null>(
    null,
  )
  const [mapExpanded, setMapExpanded] = useState(false)
  const [transportDialogOpen, setTransportDialogOpen] = useState(false)
  const [transportDialogData, setTransportDialogData] = useState<{
    fromActivityId: string
    toActivityId: string
  } | null>(null)

  // Sensors for DND
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down("md"))

  const handleViewModeChange = (_: React.SyntheticEvent, newMode: any) => {
    setViewMode(newMode)
  }

  const toggleDayCollapse = (dayId: string) => {
    const newCollapsed = new Set(collapsedDays)
    if (newCollapsed.has(dayId)) {
      newCollapsed.delete(dayId)
    } else {
      newCollapsed.add(dayId)
    }
    setCollapsedDays(newCollapsed)
  }

  const handleAddActivity = (dayId?: string) => {
    setSelectedDayId(dayId || trip?.days?.[0]?.id)
    setEditingActivity(undefined)
    setDialogOpen(true)
  }

  const handleEditActivity = (activity: Activity) => {
    setEditingActivity(activity)
    setSelectedDayId(activity.tripDayId)
    setDialogOpen(true)
  }

  const handleTransportClick = (transport: any) => {
    setTransportDialogData({
      fromActivityId: transport.fromActivityId,
      toActivityId: transport.toActivityId,
    })
    setTransportDialogOpen(true)
  }

  const handleDeleteActivity = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this activity?")) {
      await deleteActivity(id)
    }
  }

  const handleCopyActivity = async (activity: Activity) => {
    try {
      await client.post(`/activities/${activity.id}/copy`)
      queryClient.invalidateQueries({ queryKey: ["trips", tripId] })
    } catch (error) {
      console.error("Failed to copy activity:", error)
    }
  }

  const handleSubmitActivity = async (data: any) => {
    if (data.id) {
      await updateActivity({ id: data.id, data })
    } else {
      await createActivity({
        ...data,
        tripId: tripId!,
        tripDayId: data.tripDayId || selectedDayId,
      })
    }
    setDialogOpen(false)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over) return

    const activeId = active.id as string
    const overId = over.id as string

    // Find the move source and destination
    const activeDay = trip?.days?.find((d) => d.activities.some((a) => a.id === activeId))
    // 'over' could be a day ID or an activity ID
    const overDay =
      trip?.days?.find((d) => d.id === overId) || trip?.days?.find((d) => d.activities.some((a) => a.id === overId))

    if (!activeDay || !overDay) return

    if (activeId === overId && activeDay.id === overDay.id) return

    const activeActivities = [...activeDay.activities]
    const overActivities = activeDay.id === overDay.id ? activeActivities : [...overDay.activities]

    const activeIndex = activeActivities.findIndex((a) => a.id === activeId)
    // If dropped over a day container (not an activity), put it at the end
    const overIndex = trip?.days?.find((d) => d.id === overId)
      ? overActivities.length
      : overActivities.findIndex((a) => a.id === overId)

    let updates: { activityId: string; orderIndex: number; tripDayId?: string }[] = []

    if (activeDay.id === overDay.id) {
      // Reorder within the same day
      const reordered = arrayMove(activeActivities, activeIndex, overIndex)
      updates = reordered.map((a, idx) => ({
        activityId: a.id,
        orderIndex: idx,
      }))
    } else {
      // Move to a different day
      const [movedActivity] = activeActivities.splice(activeIndex, 1)
      overActivities.splice(overIndex, 0, movedActivity)

      // Get updates for both days
      const activeUpdates = activeActivities.map((a, idx) => ({
        activityId: a.id,
        orderIndex: idx,
      }))
      const overUpdates = overActivities.map((a, idx) => ({
        activityId: a.id,
        orderIndex: idx,
        tripDayId: overDay.id,
      }))
      updates = [...activeUpdates, ...overUpdates]
    }

    if (updates.length > 0) {
      reorderActivities(updates)
    }
  }

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="100vh">
        <CircularProgress />
      </Box>
    )
  }

  if (error || !trip) {
    return (
      <Box p={3}>
        <Alert severity="error">Failed to load trip: {(error as any)?.message || "Unknown error"}</Alert>
      </Box>
    )
  }

  return (
    <Box
      sx={{
        pb: 8,
        px: { xs: 1, md: 2 },
        "@media print": {
          px: 0,
          pb: 0,
          // Hide navigation and buttons when printing
          "& .no-print": {
            display: "none !important",
          },
          // Ensure colors come through
          WebkitPrintColorAdjust: "exact",
          printColorAdjust: "exact",
        },
      }}
    >
      <Paper
        elevation={0}
        className="no-print"
        sx={{
          p: 2,
          mb: 2,
          position: "sticky",
          top: 0,
          zIndex: 10,
          borderBottom: 1,
          borderColor: "divider",
          bgcolor: "background.paper",
        }}
      >
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Box display="flex" alignItems="center" gap={1}>
            <IconButton onClick={() => navigate("/trips")}>
              <BackIcon />
            </IconButton>
            <Typography variant="h5" component="h1">
              {trip.name}
            </Typography>
          </Box>
          <Box display="flex" gap={1}>
            <Button
              variant="outlined"
              startIcon={<SettingsIcon />}
              size="small"
              onClick={() => setSettingsDialogOpen(true)}
            >
              Settings
            </Button>
            <Button
              variant="outlined"
              startIcon={<PeopleIcon />}
              size="small"
              onClick={() => setMembersDialogOpen(true)}
            >
              Members
            </Button>
            <Button variant="outlined" startIcon={<PrintIcon />} size="small" onClick={() => window.print()}>
              Print
            </Button>
          </Box>
        </Box>

        <Box sx={{ mt: 2, display: "flex", gap: 1, overflowX: "auto", pb: 1 }}>
          <Chip
            label={`${dayjs(trip.startDate).format("MMM D")} - ${dayjs(trip.endDate).format("MMM D, YYYY")}`}
            variant="outlined"
          />
          {trip.destination && <Chip label={trip.destination} variant="outlined" />}
          <Chip label={`${trip.days?.length || 0} Days`} variant="outlined" />
        </Box>
      </Paper>
      <Box className="no-print" sx={{ display: "flex", justifyContent: "center", mb: 2 }}>
        <Tabs value={viewMode} onChange={handleViewModeChange} sx={{ bgcolor: "background.paper" }}>
          <Tab icon={<ListIcon />} label="Itinerary" iconPosition="start" value="list" />
          <Tab icon={<PrepIcon />} label="Preparation" iconPosition="start" value="prep" />
          <Tab icon={<ExpenseIcon />} label="Expenses" iconPosition="start" value="expenses" />
          <Tab icon={<TimelineIcon />} label="Timeline" iconPosition="start" value="timeline" />
          <Tab icon={<JournalIcon />} label="Journal" iconPosition="start" value="journal" />
          <Tab icon={<AnimationIcon />} label="Animation" iconPosition="start" value="animation" />
        </Tabs>
      </Box>

      <Box sx={{ maxWidth: 1600, mx: "auto", px: { xs: 1, md: 2 } }}>
        {viewMode === "list" && (
          <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
            <Grid container spacing={3}>
              {!mapExpanded && (
                <Grid size={{ xs: 12, md: 7 }}>
                  {trip.days?.map((day) => {
                    const isCollapsed = collapsedDays.has(day.id)
                    return (
                      <Box key={day.id} sx={{ mb: 3 }}>
                        <Paper sx={{ p: 2 }}>
                          <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                            <Box display="flex" alignItems="center" gap={1}>
                              <IconButton size="small" onClick={() => toggleDayCollapse(day.id)}>
                                {isCollapsed ? <ExpandMore /> : <ExpandLess />}
                              </IconButton>
                              <Typography variant="h6" color="primary">
                                {day.name || `Day ${day.dayNumber}`}
                              </Typography>
                              <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                                ({dayjs(day.date).format("MMM D")})
                              </Typography>
                            </Box>
                            <IconButton size="small" onClick={() => handleAddActivity(day.id)}>
                              <AddIcon />
                            </IconButton>
                          </Box>
                          <Collapse in={!isCollapsed}>
                            <DroppableDay dayId={day.id}>
                              <SortableContext
                                items={day.activities.map((a) => a.id)}
                                strategy={verticalListSortingStrategy}
                              >
                                {day.activities
                                  .slice()
                                  .sort((a, b) => {
                                    if (!a.scheduledStart || !b.scheduledStart) return 0
                                    return new Date(a.scheduledStart).getTime() - new Date(b.scheduledStart).getTime()
                                  })
                                  .map((activity, index, sortedActivities) => (
                                    <Box key={activity.id}>
                                      <SortableActivityCard
                                        activity={activity}
                                        onEdit={() => handleEditActivity(activity)}
                                        onDelete={() => handleDeleteActivity(activity.id)}
                                        onCopy={() => handleCopyActivity(activity)}
                                        onFlyTo={(act) =>
                                          act.latitude &&
                                          act.longitude &&
                                          setActiveFlyToLocation({
                                            lat: act.latitude,
                                            lng: act.longitude,
                                            _ts: Date.now(),
                                          })
                                        }
                                      />
                                      {index < sortedActivities.length - 1 && (
                                        <TransportSegment
                                          tripId={trip.id}
                                          fromActivityId={activity.id}
                                          toActivityId={sortedActivities[index + 1].id}
                                          alternatives={
                                            trip.transport?.filter(
                                              (t) =>
                                                t.fromActivityId === activity.id &&
                                                t.toActivityId === sortedActivities[index + 1].id,
                                            ) || []
                                          }
                                        />
                                      )}
                                    </Box>
                                  ))}
                              </SortableContext>
                            </DroppableDay>
                          </Collapse>
                        </Paper>
                      </Box>
                    )
                  })}
                </Grid>
              )}
              {!isMobile && (
                <Grid size={{ xs: 12, md: mapExpanded ? 12 : 5 }}>
                  <Box sx={{ position: "sticky", top: 120, height: "calc(100vh - 160px)" }}>
                    <Box display="flex" justifyContent="flex-end" mb={1}>
                      <Button
                        size="small"
                        startIcon={mapExpanded ? <ExpandLess /> : <TimelineIcon />}
                        onClick={() => setMapExpanded(!mapExpanded)}
                      >
                        {mapExpanded ? "Show Activities" : "Maximize Map"}
                      </Button>
                    </Box>
                    <TripMap
                      activities={trip.activities}
                      days={trip.days?.map((d) => ({ id: d.id, name: d.name, dayIndex: d.dayNumber - 1 }))}
                      activeFlyToLocation={activeFlyToLocation}
                      onCreateActivity={() => {
                        setSelectedDayId(trip.days?.[0]?.id)
                        setEditingActivity(undefined)
                        setDialogOpen(true)
                        // TODO: Pre-fill coordinates in ActivityDialog
                      }}
                    />
                  </Box>
                </Grid>
              )}
            </Grid>
          </DndContext>
        )}

        {viewMode === "prep" && <PreparationTab trip={trip} />}

        {viewMode === "expenses" && (
          <Box mt={3} sx={{ minHeight: 600 }}>
            <ExpensesPanel
              tripId={trip.id}
              trip={trip}
              defaultCurrency={trip.defaultCurrency}
              currencies={trip.currencies}
              onEditActivity={handleEditActivity}
            />
          </Box>
        )}

        {viewMode === "timeline" && trip.days && (
          <TimelineCalendarView
            days={trip.days}
            transport={trip.transport}
            onActivityClick={handleEditActivity}
            onTransportClick={handleTransportClick}
            onActivityUpdate={(id, data) => updateActivity({ id, data })}
          />
        )}

        {viewMode === "journal" && trip.days && <JournalPanel tripId={trip.id} days={trip.days} />}

        {viewMode === "animation" && (
          <Box
            sx={{
              display: "flex",
              gap: 2,
              height: "calc(100vh - 300px)",
              minHeight: "600px",
              flexDirection: { xs: "column", md: "row" },
            }}
          >
            {/* Map - Left Side (60%) */}
            <Box
              sx={{
                flex: { xs: "1", md: "0 0 60%" },
                height: "100%",
                border: "1px solid",
                borderColor: "divider",
                borderRadius: 1,
              }}
            >
              <TripMap
                activities={trip.activities}
                days={trip.days?.map((d) => ({ id: d.id, name: d.name, dayIndex: d.dayNumber - 1 }))}
                hideAnimationControl={false}
              />
            </Box>

            {/* Animation List - Right Side (40%) */}
            <Box sx={{ flex: { xs: "1", md: "0 0 40%" }, height: "100%" }}>
              <Paper sx={{ height: "100%", p: 2, overflowY: "auto" }}>
                <Typography variant="h6" gutterBottom>
                  Trip Animation
                </Typography>
                <Typography variant="body2" color="text.secondary" paragraph>
                  Use the &quot;Play Trip&quot; button on the map to animate your journey chronologically through all
                  activities.
                </Typography>
                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle2" gutterBottom fontWeight="bold">
                    Animation Features:
                  </Typography>
                  <Typography variant="body2" component="ul" sx={{ pl: 2 }}>
                    <li>Follows the route through all scheduled activities</li>
                    <li>Shows moving marker along the path</li>
                    <li>Animates in chronological order</li>
                    <li>Click &quot;Stop&quot; to pause the animation</li>
                    <li>Use the progress slider to jump to different points</li>
                  </Typography>
                </Box>
                {trip.activities && trip.activities.length > 0 && (
                  <Box sx={{ mt: 3 }}>
                    <Typography variant="subtitle2" gutterBottom fontWeight="bold">
                      Activity Sequence ({trip.activities.filter((a) => a.latitude && a.longitude).length} stops):
                    </Typography>
                    <Box sx={{ mt: 1, maxHeight: "400px", overflowY: "auto" }}>
                      {trip.activities
                        .filter((a) => a.latitude && a.longitude)
                        .sort((a, b) => {
                          if (!a.scheduledStart || !b.scheduledStart) return 0
                          return new Date(a.scheduledStart).getTime() - new Date(b.scheduledStart).getTime()
                        })
                        .map((activity, index) => (
                          <Paper
                            key={activity.id}
                            variant="outlined"
                            sx={{
                              p: 1.5,
                              mb: 1,
                              cursor: "pointer",
                              "&:hover": { bgcolor: "action.hover" },
                            }}
                            onClick={() => {
                              if (activity.latitude && activity.longitude) {
                                setActiveFlyToLocation({
                                  lat: activity.latitude,
                                  lng: activity.longitude,
                                  _ts: Date.now(),
                                })
                              }
                            }}
                          >
                            <Box display="flex" alignItems="center" gap={1}>
                              <Chip label={index + 1} size="small" color="primary" />
                              <Typography variant="body2" fontWeight="medium">
                                {activity.name}
                              </Typography>
                            </Box>
                            {activity.scheduledStart && (
                              <Tooltip
                                title={`Warning: This activity is usually not available on ${dayjs(
                                  activity.scheduledStart || activity.tripDay?.date,
                                ).format("dddd")}. Available days: ${activity.availableDays.join(", ")}`}
                              >
                                <Typography variant="caption" color="text.secondary" sx={{ ml: 4 }}>
                                  {dayjs(activity.scheduledStart).format("MMM D, h:mm A")}
                                </Typography>
                              </Tooltip>
                            )}
                          </Paper>
                        ))}
                    </Box>
                  </Box>
                )}
              </Paper>
            </Box>
          </Box>
        )}
      </Box>

      <ActivityDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSubmit={handleSubmitActivity}
        isLoading={false}
        activity={editingActivity}
        tripDayId={selectedDayId}
        tripId={trip.id}
        tripDays={trip.days}
        tripStartDate={trip.startDate}
        tripEndDate={trip.endDate}
        fullScreen={isMobile}
      />
      <TripMembersDialog
        open={membersDialogOpen}
        onClose={() => setMembersDialogOpen(false)}
        trip={trip}
        fullScreen={isMobile}
      />
      <ExpensesDialog
        open={expensesDialogOpen}
        onClose={() => setExpensesDialogOpen(false)}
        tripId={trip.id}
        trip={trip}
        defaultCurrency={trip.defaultCurrency}
        currencies={trip.currencies}
        fullScreen={isMobile}
        onEditActivity={handleEditActivity}
      />
      <TripSettingsDialog
        open={settingsDialogOpen}
        onClose={() => setSettingsDialogOpen(false)}
        trip={trip}
        onUpdate={updateTrip}
        fullScreen={isMobile}
      />
      {transportDialogData && (
        <TransportDialog
          open={transportDialogOpen}
          onClose={() => {
            setTransportDialogOpen(false)
            setTransportDialogData(null)
          }}
          tripId={trip.id}
          fromActivityId={transportDialogData.fromActivityId}
          toActivityId={transportDialogData.toActivityId}
          alternatives={
            trip.transport?.filter(
              (t) =>
                t.fromActivityId === transportDialogData.fromActivityId &&
                t.toActivityId === transportDialogData.toActivityId,
            ) || []
          }
        />
      )}
    </Box>
  )
}

export default TripDetailsPage
