import { PointerSensor, useSensor, useSensors } from "@dnd-kit/core"
import { Box, CircularProgress, Alert, useMediaQuery, useTheme } from "@mui/material"
import { useParams } from "react-router-dom"

import client from "../api/client"
import ActivityDialog from "../components/ActivityDialog"
import { TripDetailsContent } from "../components/TripDetailsContent"
import { TripDetailsHeader } from "../components/TripDetailsHeader"
import { TripSettingsDialog } from "../components/TripSettingsDialog"
import { useTripDetails } from "../hooks/useTripDetails"
import { useTripDetailsUI } from "../hooks/useTripDetailsUI"
import { useAuthStore } from "../stores/authStore"
import { useLanguageStore } from "../stores/languageStore"

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

  const {
    viewMode,
    handleViewModeChange,
    dialogOpen,
    setDialogOpen,
    membersDialogOpen,
    setMembersDialogOpen,
    settingsDialogOpen,
    setSettingsDialogOpen,
    selectedDayId,
    editingActivity,
    collapsedDays,
    toggleDayCollapse,
    activeFlyToLocation,
    setActiveFlyToLocation,
    mapExpanded,
    setMapExpanded,
    initialCoordinates,
    handleAddActivity,
    handleEditActivity,
  } = useTripDetailsUI()

  const currentUser = useAuthStore((state) => state.user)
  const isOwner = trip?.userId === currentUser?.id
  const userMember = trip?.members?.find(
    (m) => m.userId === currentUser?.id || (currentUser?.email && m.email === currentUser.email),
  )
  const userRole = isOwner ? "OWNER" : userMember?.role || "VIEWER"
  const canEdit = userRole === "OWNER" || userRole === "EDITOR"

  // UI Support
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down("md"))

  // DnD Sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
  )

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
    // Minimal DnD logic
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

      <TripDetailsContent
        viewMode={viewMode}
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
        handleSaveAnimation={handleSaveAnimation}
        handleDeleteAnimation={handleDeleteAnimation}
        handleDayOperation={handleDayOperation}
        updateActivity={updateActivity}
        selectScenario={selectScenario}
        createScenario={createScenario}
        updateScenario={updateScenario}
      />

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
