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
  Download as DownloadIcon,
  AttachMoney,
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from "@mui/material"
import { useQueryClient } from "@tanstack/react-query"
import dayjs from "dayjs"
import React, { useState } from "react"
import { useNavigate, useParams, useSearchParams } from "react-router-dom"

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
import { useAuthStore } from "../stores/authStore"
import { useLanguageStore } from "../stores/languageStore"
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
  const { t } = useLanguageStore()
  const { tripId } = useParams<{ tripId: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const {
    trip,
    isLoading,
    error,
    createActivity,
    updateActivity,
    deleteActivity,
    updateTrip,
    reorderActivities,
    moveActivities,
    swapDays,
    updateDay,
    createAnimation,
    updateAnimation,
    deleteAnimation,
    selectScenario,
    createScenario,
    updateScenario,
  } = useTripDetails(tripId!)

  const currentUser = useAuthStore((state) => state.user)
  const isOwner = trip?.userId === currentUser?.id
  const userMember = trip?.members?.find(
    (m) => m.userId === currentUser?.id || (currentUser?.email && m.email === currentUser.email),
  )
  const userRole = isOwner ? "OWNER" : userMember?.role || "VIEWER"
  const canEdit = userRole === "OWNER" || userRole === "EDITOR"

  // UI State
  // URL Search Params for View State
  const [searchParams, setSearchParams] = useSearchParams()
  const viewMode = (searchParams.get("view") as any) || "list"

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
  const [renameDayDialog, setRenameDayDialog] = useState<{ dayId: string; name: string } | null>(null)
  const [prefilledCoordinates, setPrefilledCoordinates] = useState<{ lat: number; lng: number } | undefined>(undefined)

  // Stable activities for map/animation to avoid re-renders
  const activitiesWithCoords = React.useMemo(() => {
    return trip?.activities || []
  }, [trip?.activities])

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
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      if (newMode === "list") {
        next.delete("view")
      } else {
        next.set("view", newMode)
      }
      return next
    })
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

  const handleAddActivity = (dayId?: string, coordinates?: { lat: number; lng: number }) => {
    setSelectedDayId(dayId || trip?.days?.[0]?.id)
    setEditingActivity(undefined)
    setPrefilledCoordinates(coordinates)
    setDialogOpen(true)
  }

  const handleEditActivity = (activity: Activity) => {
    // Look up the activity in the current trip state to ensure we have the latest version
    // (prevents issues where child components might pass a stale activity object)
    const freshActivity = trip?.activities?.find((a) => a.id === activity.id) || activity
    setEditingActivity(freshActivity)
    setSelectedDayId(freshActivity.tripDayId)
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
    if (!canEdit) return
    if (window.confirm(t("areYouSureDeleteActivity"))) {
      await deleteActivity(id)
    }
  }

  const handleCopyActivity = async (activityId: string, asLink?: boolean) => {
    try {
      await client.post(`/activities/${activityId}/copy`, { asLink })
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
    if (!over || !canEdit) return

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

    let updates: {
      activityId: string
      orderIndex: number
      tripDayId?: string
      scheduledStart?: string | null
      scheduledEnd?: string | null
    }[] = []

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
      // Calculate date shift
      const dayDiff = dayjs(overDay.date).startOf("day").diff(dayjs(activeDay.date).startOf("day"), "day")

      const activeUpdates = activeActivities.map((a, idx) => ({
        activityId: a.id,
        orderIndex: idx,
      }))
      const overUpdates = overActivities.map((a, idx) => {
        const update: any = {
          activityId: a.id,
          orderIndex: idx,
          tripDayId: overDay.id,
        }

        // If this is the moved activity, shift its dates
        if (a.id === activeId && a.scheduledStart && dayDiff !== 0) {
          update.scheduledStart = dayjs(a.scheduledStart).add(dayDiff, "day").toISOString()
          if (a.scheduledEnd) {
            update.scheduledEnd = dayjs(a.scheduledEnd).add(dayDiff, "day").toISOString()
          }
        }
        return update
      })
      updates = [...activeUpdates, ...overUpdates]
    }

    if (updates.length > 0) {
      reorderActivities(updates)
    }
  }

  // KML Export
  const handleExportKML = () => {
    if (!trip?.activities || trip.activities.length === 0) return

    const kmlHeader = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>${(trip.name || "Trip").replace(/&/g, "&amp;")}</name>`

    const kmlFooter = `
  </Document>
</kml>`

    const placemarks = trip.activities
      .filter((a) => a.latitude && a.longitude)
      .map(
        (a) => `
    <Placemark>
      <name>${(a.name || "").replace(/&/g, "&amp;")}</name>
      <description>${(a.description || "").replace(/&/g, "&amp;")}</description>
      <Point>
        <coordinates>${a.longitude},${a.latitude},0</coordinates>
      </Point>
    </Placemark>`,
      )
      .join("")

    const kmlContent = kmlHeader + (placemarks || "") + kmlFooter

    const blob = new Blob([kmlContent], { type: "application/vnd.google-earth.kml+xml" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `${(trip.name || "trip").replace(/\s+/g, "_").toLowerCase()}.kml`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const handleDayOperation = async (type: "move_all" | "swap" | "rename", dayId: string, payload: any) => {
    try {
      if (type === "move_all") {
        if (!trip?.id) return
        await moveActivities({ dayId, targetDayId: payload.targetDayId })
      } else if (type === "swap") {
        if (!trip?.id) return
        await swapDays({ dayId1: payload.dayId1, dayId2: payload.dayId2 })
      } else if (type === "rename") {
        if (!trip?.id) return
        await updateDay({ dayId, updates: { name: payload.name } })
      }
    } catch (error) {
      console.error("Day operation failed:", error)
      // Show error?
    }
  }

  const handleSaveAnimation = async (data: any) => {
    try {
      if (data.id) {
        await updateAnimation(data.id, data)
      } else {
        await createAnimation(data)
      }
    } catch (error) {
      console.error("Failed to save animation:", error)
    }
  }

  const handleDeleteAnimation = async (id: string) => {
    try {
      await deleteAnimation(id)
    } catch (error) {
      console.error("Failed to delete animation:", error)
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
        <Alert severity="error">
          {t("failedToLoad")}: {(error as any)?.message || "Unknown error"}
        </Alert>
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
            <Chip
              label={`${dayjs(trip.startDate).format("MMM D")} - ${dayjs(trip.endDate).format("MMM D, YYYY")}`}
              variant="outlined"
              size="small"
              sx={{ ml: 1 }}
            />
            <Box display="flex" gap={1} flexShrink={0}>
              {trip.destination && <Chip label={trip.destination} variant="outlined" size="small" />}
              <Chip label={`${trip.days?.length || 0} ${t("days")}`} variant="outlined" size="small" />
            </Box>
          </Box>
          <Box display="flex" gap={1}>
            <Button
              variant="outlined"
              startIcon={<SettingsIcon />}
              size="small"
              onClick={() => setSettingsDialogOpen(true)}
              disabled={!canEdit}
            >
              {t("settings")}
            </Button>
            <Button
              variant="outlined"
              startIcon={<PeopleIcon />}
              size="small"
              onClick={() => setMembersDialogOpen(true)}
              disabled={!canEdit}
            >
              {t("members")}
            </Button>
            <Button variant="outlined" startIcon={<PrintIcon />} size="small" onClick={() => window.print()}>
              {t("print")}
            </Button>
            <Button variant="outlined" startIcon={<DownloadIcon />} size="small" onClick={handleExportKML}>
              {t("exportKML")}
            </Button>
          </Box>
        </Box>

        <Box
          sx={{
            mt: 2,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            overflowX: "auto",
            pb: 1,
            borderTop: 1,
            borderColor: "divider",
            pt: 1,
          }}
        >
          <Box className="no-print">
            <Tabs
              value={viewMode}
              onChange={handleViewModeChange}
              centered
              sx={{ minHeight: "32px", "& .MuiTab-root": { minHeight: "32px", py: 0 } }}
            >
              <Tab
                icon={<ListIcon sx={{ fontSize: "1.1rem" }} />}
                label={t("itinerary")}
                iconPosition="start"
                value="list"
                sx={{ minHeight: "32px" }}
              />
              <Tab
                icon={<PrepIcon sx={{ fontSize: "1.1rem" }} />}
                label={t("preparation")}
                iconPosition="start"
                value="prep"
                sx={{ minHeight: "32px" }}
              />
              <Tab
                icon={<ExpenseIcon sx={{ fontSize: "1.1rem" }} />}
                label={t("expenses")}
                iconPosition="start"
                value="expenses"
                sx={{ minHeight: "32px" }}
              />
              <Tab
                icon={<TimelineIcon sx={{ fontSize: "1.1rem" }} />}
                label={t("timeline")}
                iconPosition="start"
                value="timeline"
                sx={{ minHeight: "32px" }}
              />
              <Tab
                icon={<JournalIcon sx={{ fontSize: "1.1rem" }} />}
                label={t("journal")}
                iconPosition="start"
                value="journal"
                sx={{ minHeight: "32px" }}
              />
              <Tab
                icon={<AnimationIcon sx={{ fontSize: "1.1rem" }} />}
                label={t("animation")}
                iconPosition="start"
                value="animation"
                sx={{ minHeight: "32px" }}
              />
            </Tabs>
          </Box>
        </Box>
      </Paper>

      <Box sx={{ maxWidth: 1600, mx: "auto", px: { xs: 1, md: 2 } }}>
        {viewMode === "list" && (
          <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
            <Grid container spacing={3}>
              {!mapExpanded && (
                <Grid size={{ xs: 12, md: 7 }}>
                  {trip.days?.map((day) => {
                    const isCollapsed = collapsedDays.has(day.id)
                    const activeScenario = day.scenarios?.find((s) => s.isSelected)
                    const displayActivities = activeScenario ? activeScenario.activities || [] : day.activities

                    return (
                      <Box key={day.id} sx={{ mb: 3 }}>
                        <Paper sx={{ p: 2, bgcolor: activeScenario ? "#f8faff" : "background.paper" }}>
                          <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                            <Box display="flex" alignItems="center" gap={1}>
                              <IconButton size="small" onClick={() => toggleDayCollapse(day.id)}>
                                {isCollapsed ? <ExpandMore /> : <ExpandLess />}
                              </IconButton>
                              <Typography variant="h6" color="primary">
                                Day {day.dayNumber}: {day.name || dayjs(day.date).format("MMMM D, YYYY")}
                                {activeScenario && (
                                  <Chip
                                    label={activeScenario.name}
                                    size="small"
                                    sx={{ ml: 1 }}
                                    color="secondary"
                                    variant="outlined"
                                  />
                                )}
                              </Typography>
                            </Box>
                            <Box display="flex" alignItems="center" gap={1}>
                              {(() => {
                                const dayCost = displayActivities.reduce(
                                  (sum, activity) => sum + (Number(activity.estimatedCost) || 0),
                                  0,
                                )
                                const costColor =
                                  dayCost === 0
                                    ? "default"
                                    : dayCost > 200
                                      ? "error"
                                      : dayCost > 100
                                        ? "warning"
                                        : "success"
                                return dayCost > 0 ? (
                                  <Chip
                                    size="small"
                                    icon={<AttachMoney />}
                                    label={`$${dayCost.toFixed(0)}`}
                                    color={costColor}
                                    variant="outlined"
                                  />
                                ) : null
                              })()}
                              {canEdit && (
                                <IconButton size="small" onClick={() => handleAddActivity(day.id)}>
                                  <AddIcon />
                                </IconButton>
                              )}
                            </Box>
                          </Box>
                          <Collapse in={!isCollapsed}>
                            <DroppableDay dayId={day.id}>
                              <SortableContext
                                items={displayActivities.map((a) => a.id)}
                                strategy={verticalListSortingStrategy}
                              >
                                {displayActivities
                                  .slice()
                                  .sort((a, b) => {
                                    if (!a.scheduledStart || !b.scheduledStart) return 0
                                    return new Date(a.scheduledStart).getTime() - new Date(b.scheduledStart).getTime()
                                  })
                                  .map((activity, index, sortedActivities) => (
                                    <Box key={activity.id}>
                                      <SortableActivityCard
                                        activity={activity}
                                        canEdit={canEdit}
                                        onEdit={() => handleEditActivity(activity)}
                                        onDelete={() => handleDeleteActivity(activity.id)}
                                        onCopy={(act, asLink) => handleCopyActivity(act.id, asLink)}
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
                        {mapExpanded ? t("showActivities") : t("maximizeMap")}
                      </Button>
                    </Box>
                    <TripMap
                      activities={trip.activities}
                      days={trip.days?.map((d) => ({ id: d.id, name: d.name, dayIndex: d.dayNumber - 1 }))}
                      activeFlyToLocation={activeFlyToLocation}
                      onCreateActivity={(latLng) => {
                        handleAddActivity(undefined, latLng)
                      }}
                      viewMode={viewMode}
                      title={trip.name}
                      animations={trip.animations}
                      onSaveAnimation={handleSaveAnimation}
                      onDeleteAnimation={handleDeleteAnimation}
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
            onActivityCopy={handleCopyActivity}
            onDayOperation={handleDayOperation}
            onScenarioChange={async (dayId, scenarioId) => {
              if (scenarioId) {
                await selectScenario(scenarioId)
              } else {
                // Handle switching to main plan (which might be just deselecting all?
                // The current backend selectScenario logic deselects others.
                // If we want "Main Plan" (no scenario selected), we might need a deselect endpoint or logic.
                // Assuming "Main Plan" just means no scenario is selected aka showing default activities?
                // Actually the current TripService returns all activities anyway?
                // Wait, if a scenario is selected, the UI should probably filtering?
                // No, the TripService normally returns ALL activities.
                // The `DayScenario` logic seems to be: Activities can belong to a scenario.
                // If I select a "Main Plan", probably I want to see activities with `scenarioId: null`.
                // If I select a Scenario, I want to see activities with `scenarioId: SCENARIO_ID`.
                // Backend `selectScenario` sets `isSelected=true`.
                // Frontend should probably rely on this field.
                // But if I want to switch back to "Main Plan"?
                // I need to deselect active scenario for that day.
                // The current backend doesn't seem to have a "deselect all for day" endpoint easily exposed
                // except maybe iterating?
                // I'll assume for now switching to another scenario works. Switching to "Main Plan" (empty id)
                // might need a new endpoint or careful handling.
                // Let's implement a 'deselect' call if needed, or update the select endpoint to handle null?
                // The `selectScenario` in backend requires an ID.
                console.log("Switching to Main Plan not fully implemented in backend yet without ID")
              }
            }}
            onCreateScenario={(dayId, name) => createScenario({ tripDayId: dayId, name })}
            onRenameScenario={(dayId, scenarioId, newName) =>
              updateScenario({ tripDayId: dayId, scenarioId, data: { name: newName } })
            }
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
                activities={activitiesWithCoords}
                days={trip.days?.map((d) => ({ id: d.id, name: d.name, dayIndex: d.dayNumber - 1 }))}
                hideAnimationControl={false}
                viewMode={viewMode}
                title={trip.name}
                animations={trip.animations}
                onSaveAnimation={handleSaveAnimation}
                onDeleteAnimation={handleDeleteAnimation}
                canEdit={canEdit}
              />
            </Box>

            {/* Animation List - Right Side (40%) */}
            <Box sx={{ flex: { xs: "1", md: "0 0 40%" }, height: "100%" }}>
              <Paper sx={{ height: "100%", p: 2, overflowY: "auto" }}>
                <Typography variant="h6" gutterBottom>
                  {t("animation")}
                </Typography>
                <Typography variant="body2" color="text.secondary" paragraph>
                  {t("animationInstructions")}
                </Typography>
                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle2" gutterBottom fontWeight="bold">
                    {t("animationFeaturesTitle")}
                  </Typography>
                  <Typography variant="body2" component="ul" sx={{ pl: 2 }}>
                    <li>{t("animationFeature1")}</li>
                    <li>{t("animationFeature2")}</li>
                    <li>{t("animationFeature3")}</li>
                    <li>{t("animationFeature4")}</li>
                    <li>{t("animationFeature5")}</li>
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
                                  {dayjs(activity.scheduledStart || activity.tripDay?.date).format("MMM D, h:mm A")}
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
        tripEndDate={trip.endDate}
        tripDays={trip.days}
        tripStartDate={trip.startDate}
        fullScreen={isMobile}
        initialCoordinates={prefilledCoordinates}
        onCopy={handleCopyActivity}
        canEdit={canEdit}
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

      <Dialog open={Boolean(renameDayDialog)} onClose={() => setRenameDayDialog(null)}>
        <DialogTitle>Rename Day</DialogTitle>
        <DialogContent sx={{ pt: 2, minWidth: 300 }}>
          <TextField
            autoFocus
            fullWidth
            label={t("dayName")}
            value={renameDayDialog?.name || ""}
            onChange={(e) => setRenameDayDialog((prev) => (prev ? { ...prev, name: e.target.value } : null))}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                if (renameDayDialog) {
                  updateDay({ dayId: renameDayDialog.dayId, updates: { name: renameDayDialog.name } })
                  setRenameDayDialog(null)
                }
              }
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRenameDayDialog(null)}>{t("cancel")}</Button>
          <Button
            onClick={() => {
              if (renameDayDialog) {
                updateDay({ dayId: renameDayDialog.dayId, updates: { name: renameDayDialog.name } })
                setRenameDayDialog(null)
              }
            }}
            variant="contained"
          >
            {t("save")}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default TripDetailsPage
