import {
  Box,
  CircularProgress,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
} from "@mui/material"
import React, { useEffect, useState } from "react"
import { useParams, useNavigate } from "react-router-dom"

import { FeatureDetailsModal } from "../components/SavedFeaturesDrawer/FeatureDetailsModal"
import { TripDetailView } from "../components/SavedFeaturesDrawer/TripViews/TripDetailView"
import { AddFeatureModal } from "../components/Trips/AddFeatureModal"
import { AddLocationModal } from "../components/Trips/AddLocationModal"
import { EditItemModal } from "../components/Trips/EditItemModal"
import { useTripContext, DayLocation, TripFeature } from "../contexts/TripContext"
import { showSuccess, showError } from "../utils/notifications"

interface DeleteLocationData {
  id: string
  dayId: string
}
interface DeleteFeatureData {
  item: TripFeature
  dayId: string
}

export const TripDetailPage: React.FC = () => {
  const { tripId } = useParams<{ tripId: string }>()
  const navigate = useNavigate()
  const {
    currentTrip,
    fetchTripDetails,
    loading,
    dayLocations,
    dayFeatures,
    addLocationToDay,
    addFeatureToDay,
    updateLocation,
    updateFeature,
    deleteLocation,
    deleteFeature,
    reorderItems,
    setCurrentTrip,
  } = useTripContext()

  const [isPlanningMode, setIsPlanningMode] = useState(false)
  const [selectedDayForLocation, setSelectedDayForLocation] = useState<{ id: string; date: string } | null>(null)
  const [selectedDayForFeature, setSelectedDayForFeature] = useState<{ id: string; date: string } | null>(null)
  const [editingItem, setEditingItem] = useState<{
    item: DayLocation | TripFeature
    type: "location" | "feature"
  } | null>(null)
  const [viewingFeature, setViewingFeature] = useState<TripFeature | null>(null)
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    type: "location" | "feature" | null
    data: DeleteLocationData | DeleteFeatureData | null
  }>({ type: null, data: null })
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => {
    if (tripId) {
      fetchTripDetails(tripId)
    }
    return () => {
      setCurrentTrip(null)
    }
  }, [tripId, fetchTripDetails, setCurrentTrip])

  const handleAddLocation = async (location: Omit<DayLocation, "id" | "trip_day_id" | "created_at">) => {
    if (selectedDayForLocation) {
      setActionLoading(true)
      try {
        await addLocationToDay(selectedDayForLocation.id, location)
        showSuccess("Location added to trip day!")
      } catch (error) {
        console.error("Failed to add location:", error)
        const errorMessage = error instanceof Error ? error.message : "Unknown error occurred"
        showError(`Failed to add location to trip day: ${errorMessage}`)
      } finally {
        setActionLoading(false)
        setSelectedDayForLocation(null)
      }
    }
  }

  const handleAddFeature = async (feature: unknown) => {
    if (selectedDayForFeature) {
      setActionLoading(true)
      try {
        await addFeatureToDay(selectedDayForFeature.id, feature, {
          visited: !isPlanningMode,
          planned: isPlanningMode,
        })
        showSuccess("Feature added to trip day!")
      } catch (error) {
        console.error("Failed to add feature:", error)
        const errorMessage = error instanceof Error ? error.message : "Unknown error occurred"
        showError(`Failed to add feature to trip day: ${errorMessage}`)
      } finally {
        setActionLoading(false)
        setSelectedDayForFeature(null)
      }
    }
  }

  const handleMoveItem = async (
    dayId: string,
    index: number,
    direction: "up" | "down",
    items: (DayLocation | TripFeature)[],
  ) => {
    if (!items || items.length === 0) return

    const newIndex = direction === "up" ? index - 1 : index + 1
    if (newIndex < 0 || newIndex >= items.length) return

    setActionLoading(true)

    // Create a new array with the moved item
    const newItems = [...items]
    const [movedItem] = newItems.splice(index, 1)
    newItems.splice(newIndex, 0, movedItem)

    // Prepare the payload for reorderItems
    const reorderPayload = newItems.map((item, idx) => {
      const isFeature = "type" in item && item.type === "Feature"
      return {
        id: isFeature
          ? (item as TripFeature).saved_id || (item as TripFeature).properties.id
          : (item as DayLocation).id,
        type: isFeature ? "feature" : ("location" as "feature" | "location"),
        order: idx,
      }
    })

    try {
      await reorderItems(dayId, reorderPayload)
    } catch (error) {
      console.error("Error moving item:", error)
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred"
      showError(`Failed to reorder item: ${errorMessage}`)
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
        <CircularProgress />
      </Box>
    )
  }

  if (!currentTrip) {
    return (
      <Box sx={{ p: 4, textAlign: "center" }}>
        <Typography variant="h5" color="error">
          Trip not found
        </Typography>
      </Box>
    )
  }

  return (
    <Box sx={{ height: "calc(100vh - 64px)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <TripDetailView
        trip={currentTrip}
        dayLocations={dayLocations}
        dayFeatures={dayFeatures}
        onBack={() => navigate("/")}
        isPlanningMode={isPlanningMode}
        onTogglePlanningMode={() => setIsPlanningMode((prev) => !prev)}
        onAddLocation={(id, date) => setSelectedDayForLocation({ id, date })}
        onAddFeature={(id, date) => setSelectedDayForFeature({ id, date })}
        onEditItem={(item, type) => setEditingItem({ item, type: type === "Feature" ? "feature" : "location" })}
        onDeleteItem={(item, dayId) => {
          if ("type" in item && item.type === "Feature") {
            setDeleteConfirmation({
              type: "feature",
              data: { item: item as TripFeature, dayId },
            })
          } else {
            setDeleteConfirmation({
              type: "location",
              data: { id: (item as DayLocation).id, dayId },
            })
          }
        }}
        onMoveItem={handleMoveItem}
        onFlyTo={(lat, lng) => {
          // TODO: Implement map flyTo if map is available in context or global
          console.log("Fly to", lat, lng)
        }}
        onViewFeature={setViewingFeature}
      />

      <AddLocationModal
        open={!!selectedDayForLocation}
        onClose={() => setSelectedDayForLocation(null)}
        onAddLocation={handleAddLocation}
        dayDate={selectedDayForLocation?.date || ""}
        isPlanningMode={isPlanningMode}
      />

      <AddFeatureModal
        open={!!selectedDayForFeature}
        onClose={() => setSelectedDayForFeature(null)}
        onAddFeature={handleAddFeature}
        dayDate={selectedDayForFeature?.date || ""}
      />

      <EditItemModal
        open={!!editingItem}
        onClose={() => setEditingItem(null)}
        item={editingItem?.item || null}
        type={editingItem?.type || "location"}
        onSave={async (id, updates) => {
          if (!editingItem) return
          setActionLoading(true)
          try {
            const dayId = editingItem.item.trip_day_id || ""
            if (editingItem.type === "location") {
              await updateLocation(id, dayId, updates as Partial<DayLocation>)
              showSuccess("Location updated successfully")
            } else {
              await updateFeature(id, dayId, updates as Partial<TripFeature>)
              showSuccess("Feature updated successfully")
            }
            setEditingItem(null)
          } catch (error) {
            console.error("Error saving item:", error)
            const errorMessage = error instanceof Error ? error.message : "Unknown error occurred"
            showError(`Failed to save changes: ${errorMessage}`)
          } finally {
            setActionLoading(false)
          }
        }}
      />

      <FeatureDetailsModal feature={viewingFeature} onClose={() => setViewingFeature(null)} open={!!viewingFeature} />

      <Dialog open={!!deleteConfirmation.type} onClose={() => setDeleteConfirmation({ type: null, data: null })}>
        <DialogTitle>{deleteConfirmation.type === "location" ? "Delete Location" : "Delete Feature"}</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {deleteConfirmation.type === "location"
              ? "Are you sure you want to delete this location from the day?"
              : "Are you sure you want to delete this feature from the day?"}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmation({ type: null, data: null })}>Cancel</Button>
          <Button
            onClick={() => {
              if (deleteConfirmation.type === "location") {
                const { id, dayId } = deleteConfirmation.data as DeleteLocationData
                setActionLoading(true)
                deleteLocation(id, dayId)
                  .then(() => {
                    setDeleteConfirmation({ type: null, data: null })
                    showSuccess("Location deleted successfully")
                  })
                  .catch((error) => {
                    console.error("Error deleting location:", error)
                    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred"
                    showError(`Failed to delete location: ${errorMessage}`)
                  })
                  .finally(() => setActionLoading(false))
              } else if (deleteConfirmation.type === "feature") {
                const { item, dayId } = deleteConfirmation.data as DeleteFeatureData
                setActionLoading(true)
                deleteFeature(item.saved_id || item.properties.id, dayId)
                  .then(() => {
                    setDeleteConfirmation({ type: null, data: null })
                    showSuccess("Feature deleted successfully")
                  })
                  .catch((error) => {
                    console.error("Error deleting feature:", error)
                    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred"
                    showError(`Failed to delete feature: ${errorMessage}`)
                  })
                  .finally(() => setActionLoading(false))
              }
            }}
            color="error"
            autoFocus
            disabled={actionLoading}
          >
            {actionLoading ? <CircularProgress size={24} /> : "Confirm"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
