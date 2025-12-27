import { PointerSensor, useSensor, useSensors } from "@dnd-kit/core"
import { Box, CircularProgress, Alert, Snackbar, useMediaQuery, useTheme } from "@mui/material"
import { useState } from "react"
import { useParams } from "react-router-dom"

import client from "../api/client"
import ActivityDialog from "../components/ActivityDialog"
import { ConfirmDialog } from "../components/ConfirmDialog"
import { TransportSelectionDialog } from "../components/Transport/TransportDialogs"
import { TripDetailsContent } from "../components/TripDetailsContent"
import { TripDetailsHeader } from "../components/TripDetailsHeader"
import { TripMembersDialog } from "../components/TripMembersDialog"
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
    isUpdatingTrip,
    swapDays,
    updateDay,
    createAnimation,
    updateAnimation,
    deleteAnimation,
    selectScenario,
    createScenario,
    updateScenario,
    copyActivity,
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

  // Transport Dialog State - Used by Timeline/Calendar views
  const [transportDialogOpen, setTransportDialogOpen] = useState(false)
  const [selectedTransport, setSelectedTransport] = useState<any>(null)

  const handleTransportClick = (transport: any) => {
    setSelectedTransport(transport)
    setTransportDialogOpen(true)
  }

  // Confirmation Dialog State
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean
    title: string
    content: string
    onConfirm: () => void
    isDestructive?: boolean
  }>({
    open: false,
    title: "",
    content: "",
    onConfirm: () => {},
  })

  // Snackbar State
  const [snackbar, setSnackbar] = useState<{
    open: boolean
    message: string
    severity: "success" | "error" | "info" | "warning"
  }>({
    open: false,
    message: "",
    severity: "info",
  })

  const handleCloseSnackbar = () => setSnackbar((prev) => ({ ...prev, open: false }))

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
    setConfirmDialog({
      open: true,
      title: t("deleteActivity") || "Delete Activity",
      content: t("confirmDeleteActivity") || "Are you sure you want to delete this activity?",
      isDestructive: true,
      onConfirm: () => deleteActivity(id),
    })
  }

  const handleCopyActivity = async (activityId: string, asLink?: boolean) => {
    try {
      const activity = trip?.activities?.find((a) => a.id === activityId)
      const targetDayId = activity?.tripDayId
      await copyActivity({ activityId, targetDayId, asLink })
    } catch (error) {
      console.error("Failed to copy activity:", error)
    }
  }

  const handleSubmitActivity = async (data: any) => {
    const tripDayId = editingActivity?.tripDayId || selectedDayId
    if (editingActivity && editingActivity.id) {
      await updateActivity({ id: editingActivity.id, data })
    } else {
      // Use data.tripDayId from the form if available (calculated from date), fallback to context day
      await createActivity({ ...data, tripId: tripId!, tripDayId: data.tripDayId || tripDayId })
    }
    setDialogOpen(false)
  }

  const handleDragEnd = async (event: any) => {
    const { active, over } = event

    if (!over || !active) return

    const activityId = active.id
    let targetDayId = over.id

    // Find the activity being dragged
    const activity = trip?.activities?.find((a) => a.id === activityId)
    if (!activity) return

    // If 'over' is an activity, find its day
    if (!trip?.days?.some((d) => d.id === targetDayId)) {
      const overActivity = trip?.activities?.find((a) => a.id === targetDayId)
      if (overActivity) {
        targetDayId = overActivity.tripDayId
      } else {
        return // Unknown target
      }
    }

    // If dropped on the same day, do nothing
    if (activity.tripDayId === targetDayId) return

    // Update the activity's tripDayId
    try {
      await updateActivity({
        id: activityId,
        data: { tripDayId: targetDayId },
      })
    } catch (error) {
      console.error("Failed to move activity:", error)
      setSnackbar({
        open: true,
        message: "Failed to move activity",
        severity: "error",
      })
    }
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
      setSnackbar({
        open: true,
        message: "Failed to export KML",
        severity: "error",
      })
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
    setConfirmDialog({
      open: true,
      title: t("deleteAnimation") || "Delete Animation",
      content: "Are you sure you want to delete this animation?",
      isDestructive: true,
      onConfirm: () => deleteAnimation(id),
    })
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
        onTransportClick={handleTransportClick}
      />

      {/* Dialogs */}
      <ActivityDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSubmit={handleSubmitActivity}
        activity={editingActivity}
        tripDayId={selectedDayId}
        initialCoordinates={initialCoordinates}
        canEdit={canEdit}
        tripId={tripId!}
        isLoading={false}
        tripStartDate={trip.startDate}
        tripEndDate={trip.endDate}
        tripDays={trip.days}
        currencies={trip.currencies}
        defaultCurrency={trip.defaultCurrency}
      />

      <TripSettingsDialog
        open={settingsDialogOpen}
        onClose={() => setSettingsDialogOpen(false)}
        trip={trip}
        onUpdate={updateTrip}
        isUpdating={isUpdatingTrip}
      />

      {selectedTransport && (
        <TransportSelectionDialog
          open={transportDialogOpen}
          onClose={() => setTransportDialogOpen(false)}
          tripId={tripId!}
          fromActivityId={selectedTransport.fromActivityId}
          toActivityId={selectedTransport.toActivityId}
          alternatives={
            trip.transport?.filter(
              (t) =>
                t.fromActivityId === selectedTransport.fromActivityId &&
                t.toActivityId === selectedTransport.toActivityId,
            ) || []
          }
          onEdit={() => {
            // In the page-level dialog, handle edit similarly or just reopen Selection
            // For now, let's keep it simple
          }}
          onDelete={() => {}}
        />
      )}

      {membersDialogOpen && trip && (
        <TripMembersDialog
          open={membersDialogOpen}
          onClose={() => setMembersDialogOpen(false)}
          trip={trip}
          fullScreen={isMobile}
        />
      )}

      {/* Confirmation Dialog */}
      <ConfirmDialog
        open={confirmDialog.open}
        title={confirmDialog.title}
        content={confirmDialog.content}
        onConfirm={confirmDialog.onConfirm}
        onClose={() => setConfirmDialog({ ...confirmDialog, open: false })}
        isDestructive={confirmDialog.isDestructive}
      />

      {/* Snackbar Notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: "100%" }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  )
}

export default TripDetailsPage
