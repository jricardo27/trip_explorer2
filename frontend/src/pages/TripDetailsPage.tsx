import { PointerSensor, useSensor, useSensors } from "@dnd-kit/core"
import { Box, CircularProgress, Alert, useMediaQuery, useTheme } from "@mui/material"
import React, { useState } from "react"
import { useParams, useSearchParams } from "react-router-dom"

import client from "../api/client"
import ActivityDialog from "../components/ActivityDialog"
import { ExpensesPanel } from "../components/ExpensesPanel"
import { ItineraryView } from "../components/ItineraryView"
import { JournalPanel } from "../components/JournalPanel"
import { PreparationTab } from "../components/PreparationTab"
import { TimelineCalendarView } from "../components/TimelineCalendarView"
import { TripDetailsHeader } from "../components/TripDetailsHeader"
import { TripSettingsDialog } from "../components/TripSettingsDialog"
import { useTripDetails } from "../hooks/useTripDetails"
import { useAuthStore } from "../stores/authStore"
import { useLanguageStore } from "../stores/languageStore"
import type { Activity } from "../types"

const TripDetailsPage = () => {
  const { t } = useLanguageStore()
  const { tripId } = useParams<{ tripId: string }>()
  const {
    trip,
    isLoading,
    error,
    createActivity,
    updateActivity,
    deleteActivity,
    updateTrip,
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
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down("md"))

  // URL Search Params for View State
  const [searchParams, setSearchParams] = useSearchParams()
  const viewMode = (searchParams.get("view") as any) || "list"

  const [dialogOpen, setDialogOpen] = useState(false)
  const [membersDialogOpen, setMembersDialogOpen] = useState(false)
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false)
  const [selectedDayId, setSelectedDayId] = useState<string | undefined>(undefined)
  const [editingActivity, setEditingActivity] = useState<Activity | undefined>(undefined)
  const [collapsedDays, setCollapsedDays] = useState<Set<string>>(new Set())
  const [activeFlyToLocation, setActiveFlyToLocation] = useState<{ lat: number; lng: number; _ts?: number } | null>(
    null,
  )
  const [mapExpanded, setMapExpanded] = useState(false)
  const [initialCoordinates, setInitialCoordinates] = useState<{ lat: number; lng: number } | undefined>(undefined)

  // DnD Sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
  )

  const handleViewModeChange = (_: React.SyntheticEvent, newMode: any) => {
    setSearchParams({ view: newMode })
  }

  const toggleDayCollapse = (dayId: string) => {
    setCollapsedDays((prev) => {
      const next = new Set(prev)
      if (next.has(dayId)) next.delete(dayId)
      else next.add(dayId)
      return next
    })
  }

  const handleAddActivity = (dayId?: string, coordinates?: { lat: number; lng: number }) => {
    setSelectedDayId(dayId)
    setInitialCoordinates(coordinates)
    setEditingActivity(undefined)
    setDialogOpen(true)
  }

  const handleEditActivity = (activity: Activity) => {
    setEditingActivity(activity)
    setDialogOpen(true)
  }

  const handleTransportClick = (transport: any) => {
    console.log("Transport clicked", transport)
  }

  const handleDeleteActivity = (id: string) => {
    if (window.confirm(t("delete") || "Delete?")) {
      deleteActivity(id)
    }
  }

  const handleCopyActivity = (activityId: string, asLink?: boolean) => {
    console.log("Copy activity", activityId, asLink)
  }

  const handleSubmitActivity = async (data: any) => {
    if (editingActivity) {
      await updateActivity({ id: editingActivity.id, data })
    } else {
      await createActivity({ ...data, tripId: tripId!, tripDayId: selectedDayId })
    }
    setDialogOpen(false)
  }

  const handleDragEnd = () => {
    // Minimal DnD logic for now
  }

  const handleExportKML = async () => {
    try {
      const response = await client.get(`/trips/${tripId}/export/kml`, {
        responseType: "blob",
      })
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement("a")
      link.href = url
      link.setAttribute("download", `${trip?.name || "trip"}.kml`)
      document.body.appendChild(link)
      link.click()
      link.remove()
    } catch (e) {
      console.error("Export failed", e)
    }
  }

  const handleDayOperation = async (type: "move_all" | "swap" | "rename", dayId: string, payload: any) => {
    if (type === "rename") {
      await updateDay({ dayId, updates: { name: payload.name } })
    } else if (type === "swap") {
      await swapDays({ dayId1: payload.dayId1, dayId2: payload.dayId2 })
    }
  }

  const handleSaveAnimation = async (data: any) => {
    if (data.id) {
      await updateAnimation(data.id, data)
    } else {
      await createAnimation(data)
    }
  }

  const handleDeleteAnimation = async (id: string) => {
    if (window.confirm(t("delete") || "Delete?")) {
      await deleteAnimation(id)
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
          {t("failedToLoad") || "Failed to load"}: {(error as any)?.message || "Unknown error"}
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
          "& .no-print": {
            display: "none !important",
          },
          WebkitPrintColorAdjust: "exact",
          printColorAdjust: "exact",
        },
      }}
    >
      <TripDetailsHeader
        trip={trip}
        viewMode={viewMode}
        canEdit={canEdit}
        handleViewModeChange={handleViewModeChange}
        handleExportKML={handleExportKML}
        setSettingsDialogOpen={setSettingsDialogOpen}
        setMembersDialogOpen={setMembersDialogOpen}
      />

      <Box sx={{ maxWidth: 1600, mx: "auto", px: { xs: 1, md: 2 } }}>
        {viewMode === "list" && (
          <ItineraryView
            trip={trip}
            sensors={sensors}
            handleDragEnd={handleDragEnd}
            collapsedDays={collapsedDays}
            toggleDayCollapse={toggleDayCollapse}
            canEdit={canEdit}
            handleAddActivity={handleAddActivity}
            handleEditActivity={handleEditActivity}
            handleDeleteActivity={handleDeleteActivity}
            handleCopyActivity={handleCopyActivity}
            setActiveFlyToLocation={setActiveFlyToLocation}
            activeFlyToLocation={activeFlyToLocation}
            mapExpanded={mapExpanded}
            setMapExpanded={setMapExpanded}
            isMobile={isMobile}
            viewMode={viewMode}
            handleSaveAnimation={handleSaveAnimation}
            handleDeleteAnimation={handleDeleteAnimation}
          />
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
            onScenarioChange={async (_dayId, scenarioId) => {
              if (scenarioId) {
                await selectScenario(scenarioId)
              }
            }}
            onCreateScenario={async (dayId, name) => {
              await createScenario({ tripDayId: dayId, name })
            }}
            onRenameScenario={async (dayId, scenarioId, newName) => {
              await updateScenario({ tripDayId: dayId, scenarioId, data: { name: newName } })
            }}
          />
        )}

        {viewMode === "journal" && (
          <Box mt={3}>
            <JournalPanel tripId={trip.id} days={trip.days || []} />
          </Box>
        )}
      </Box>

      {/* Dialogs */}
      <ActivityDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSubmit={handleSubmitActivity}
        activity={editingActivity}
        initialCoordinates={initialCoordinates}
        canEdit={canEdit}
        tripId={tripId!}
        isLoading={false}
        tripStartDate={trip.startDate}
        tripEndDate={trip.endDate}
        tripDays={trip.days}
      />

      <TripSettingsDialog
        open={settingsDialogOpen}
        onClose={() => setSettingsDialogOpen(false)}
        trip={trip}
        onUpdate={updateTrip}
      />

      {/* Members dialog would go here if we had one extracted - passing setter for header button */}
      {membersDialogOpen && (
        <Alert
          severity="info"
          onClose={() => setMembersDialogOpen(false)}
          sx={{ position: "fixed", bottom: 16, right: 16, zIndex: 1000 }}
        >
          Members Dialog Placeholder
        </Alert>
      )}
    </Box>
  )
}

export default TripDetailsPage
