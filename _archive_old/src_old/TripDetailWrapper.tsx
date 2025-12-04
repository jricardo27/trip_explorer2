import { Box, CircularProgress, Typography } from "@mui/material"
import React, { useEffect, useState } from "react"
import { useParams, useNavigate } from "react-router-dom"

import { TripDetailView } from "./components/SavedFeaturesDrawer/TripViews/TripDetailView"
import { useTripContext, DayLocation, TripFeature } from "./contexts/TripContext"

export const TripDetailWrapper: React.FC = () => {
  const { tripId } = useParams<{ tripId: string }>()
  const navigate = useNavigate()
  const { trips, fetchTrips, dayLocations, dayFeatures, deleteLocation, deleteFeature, reorderItems } = useTripContext()

  const [loading, setLoading] = useState(true)
  const [isPlanningMode, setIsPlanningMode] = useState(false)

  useEffect(() => {
    const load = async () => {
      if (trips.length === 0) {
        await fetchTrips()
      }
      setLoading(false)
    }
    load()
  }, [fetchTrips, trips.length])

  const trip = trips.find((t) => t.id === tripId)

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
        <CircularProgress />
      </Box>
    )
  }

  if (!trip) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h5">Trip not found</Typography>
      </Box>
    )
  }

  const handleEditItem = (item: DayLocation | TripFeature, type: "location" | "Feature") => {
    console.log("Edit item not implemented in wrapper yet", item, type)
  }

  const handleDeleteItem = (item: DayLocation | TripFeature, dayId: string) => {
    if ("city" in item) {
      deleteLocation((item as DayLocation).id, dayId)
    } else {
      const feature = item as TripFeature
      if (feature.saved_id) {
        deleteFeature(feature.saved_id, dayId)
      }
    }
  }

  const handleMoveItem = (
    dayId: string,
    index: number,
    direction: "up" | "down",
    items: (DayLocation | TripFeature)[],
  ) => {
    // Convert items to the format expected by reorderItems
    const reorderedItems = [...items]
    const item = reorderedItems[index]
    reorderedItems.splice(index, 1)
    reorderedItems.splice(direction === "up" ? index - 1 : index + 1, 0, item)

    const reorderPayload = reorderedItems.map((it, idx) => ({
      id: "city" in it ? (it as DayLocation).id : (it as TripFeature).saved_id || "",
      type: "city" in it ? ("location" as const) : ("feature" as const),
      order: idx,
    }))

    reorderItems(dayId, reorderPayload)
  }

  return (
    <Box sx={{ height: "100vh", display: "flex", flexDirection: "column" }}>
      <TripDetailView
        trip={trip}
        dayLocations={dayLocations}
        dayFeatures={dayFeatures}
        onBack={() => navigate("/")}
        onAddLocation={(dayId) => console.log("Add location to", dayId)}
        onAddFeature={(dayId) => console.log("Add feature to", dayId)}
        onEditItem={handleEditItem}
        onDeleteItem={handleDeleteItem}
        onMoveItem={handleMoveItem}
        onFlyTo={(lat, lng) => console.log("Fly to", lat, lng)}
        onViewFeature={(feature) => console.log("View feature", feature)}
        isPlanningMode={isPlanningMode}
        onTogglePlanningMode={() => setIsPlanningMode((prev) => !prev)}
      />
    </Box>
  )
}
