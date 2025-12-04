import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, closestCenter } from "@dnd-kit/core"
import {
  Box,
  Grid,
  Paper,
  Typography,
  Button,
  IconButton,
  ToggleButtonGroup,
  ToggleButton,
  MenuItem,
  TextField,
} from "@mui/material"
import React, { useState } from "react"
import { MdArrowBack, MdAdd, MdViewList, MdCalendarToday } from "react-icons/md"

import { useTripContext, DayLocation, TripFeature } from "../../contexts/TripContext"
import { EditTimeModal } from "../Trips/EditTimeModal"

import ActivityCard from "./ActivityCard"
import CanvasMap from "./CanvasMap"
import DayGridView from "./DayGridView"
import ItineraryList from "./ItineraryList"

interface TripCanvasProps {
  tripId: string
  onBack: () => void
}

const TripCanvas: React.FC<TripCanvasProps> = ({ onBack }) => {
  const {
    currentTrip,
    dayLocations,
    dayFeatures,
    reorderItems,
    deleteLocation,
    deleteFeature,
    updateLocation,
    updateFeature,
  } = useTripContext()
  const [activeDragItem, setActiveDragItem] = useState<DayLocation | TripFeature | null>(null)
  const [viewMode, setViewMode] = useState<"itinerary" | "day">("itinerary")
  const [selectedDayId, setSelectedDayId] = useState<string>("") // Reverted to original as the requested change was syntactically incorrect.
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<DayLocation | TripFeature | null>(null)

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event
    const item = active.data.current?.item
    if (item) {
      setActiveDragItem(item)
    }
  }

  const handleEditItem = (item: DayLocation | TripFeature) => {
    setEditingItem(item)
    setEditModalOpen(true)
  }

  const handleSaveEdit = async (updates: Partial<DayLocation | TripFeature>) => {
    if (!editingItem) return

    const isLocation = "city" in editingItem
    const dayId = editingItem.trip_day_id
    if (!dayId) return

    if (isLocation) {
      await updateLocation(editingItem.id, dayId, updates)
    } else {
      const featureId = editingItem.saved_id || editingItem.properties.id
      await updateFeature(featureId, dayId, updates)
    }
  }

  const handleDeleteItem = async (item: DayLocation | TripFeature, dayId: string) => {
    const isLocation = "city" in item
    if (isLocation) {
      await deleteLocation(item.id, dayId)
    } else {
      const featureId = item.saved_id || item.properties.id
      await deleteFeature(featureId, dayId)
    }
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    setActiveDragItem(null)

    if (!over) return

    const activeId = active.id as string
    const overId = over.id as string

    // Find source day and item
    let sourceDayId = ""
    let sourceItem: DayLocation | TripFeature | null = null

    // Check if active item is in dayLocations
    for (const [dayId, locations] of Object.entries(dayLocations)) {
      const found = locations.find((l) => l.id === activeId)
      if (found) {
        sourceDayId = dayId
        sourceItem = found
        break
      }
    }

    // Check if active item is in dayFeatures
    if (!sourceItem) {
      for (const [dayId, features] of Object.entries(dayFeatures)) {
        const found = features.find((f) => (f.saved_id || f.properties.id) === activeId)
        if (found) {
          sourceDayId = dayId
          sourceItem = found
          break
        }
      }
    }

    if (!sourceItem || !sourceDayId) return

    // Determine target day
    // If dropping on a DaySection (droppable id is dayId)
    let targetDayId = over.data.current?.type === "Day" ? (over.id as string) : ""

    // If dropping on another item, find its day
    if (!targetDayId) {
      // Check locations
      for (const [dayId, locations] of Object.entries(dayLocations)) {
        if (locations.some((l) => l.id === overId)) {
          targetDayId = dayId
          break
        }
      }
      // Check features
      if (!targetDayId) {
        for (const [dayId, features] of Object.entries(dayFeatures)) {
          if (features.some((f) => (f.saved_id || f.properties.id) === overId)) {
            targetDayId = dayId
            break
          }
        }
      }
    }

    if (!targetDayId) return

    // Construct the new list for the target day
    const targetLocations = dayLocations[targetDayId] || []
    const targetFeatures = dayFeatures[targetDayId] || []

    const targetItems = [
      ...targetLocations.map((l) => ({ ...l, type: "location" as const })),
      ...targetFeatures.map((f) => ({ ...f, type: "feature" as const })),
    ].sort((a, b) => (a.visit_order || 0) - (b.visit_order || 0))

    // Remove from source if different day
    if (sourceDayId !== targetDayId) {
      // We don't need to manually remove from source here because reorderItems handles the full list for the day
      // But we do need to add it to the target list before reordering
      const itemToAdd = {
        ...sourceItem,
        type: "city" in sourceItem ? ("location" as const) : ("feature" as const),
      }
      // @ts-expect-error - adding a temporary item for reordering logic
      targetItems.push(itemToAdd)
    }

    // Reorder logic
    const oldIndex = targetItems.findIndex(
      (item) => ("city" in item ? item.id : item.saved_id || item.properties.id) === activeId,
    )

    const newIndex = targetItems.findIndex(
      (item) => ("city" in item ? item.id : item.saved_id || item.properties.id) === overId,
    )

    const newItems = [...targetItems]

    // If moving within same day
    if (sourceDayId === targetDayId) {
      if (oldIndex !== -1 && newIndex !== -1) {
        const [movedItem] = newItems.splice(oldIndex, 1)
        newItems.splice(newIndex, 0, movedItem)
      }
    } else {
      // If moving to different day, we already added it to the end.
      // If we dropped on a specific item, move it there.
      if (newIndex !== -1) {
        const movedItem = newItems.pop()! // The one we just added
        newItems.splice(newIndex, 0, movedItem)
      }
      // If dropped on the day header, it stays at the end (or beginning?)
      // For now let's leave it at the end if dropped on header
    }

    // Prepare payload for API
    const payload = newItems.map((item, index) => ({
      id: "city" in item ? item.id : item.saved_id || item.properties.id,
      type: "city" in item ? ("location" as const) : ("feature" as const),
      order: index,
    }))

    // Call API
    // If different days, we might need to update both.
    // But reorderItems usually only updates one day.
    // We need a way to move items between days.
    // The current reorderItems might not support moving between days directly if it only takes one dayId.
    // Let's check TripContext.

    // Assuming reorderItems only reorders within a day.
    // If moving between days, we need to call it for both days.

    if (sourceDayId !== targetDayId) {
      // Update source day (remove item)
      const sourceLocations = dayLocations[sourceDayId] || []
      const sourceFeatures = dayFeatures[sourceDayId] || []
      const sourceItems = [
        ...sourceLocations.map((l) => ({ ...l, type: "location" as const })),
        ...sourceFeatures.map((f) => ({ ...f, type: "feature" as const })),
      ]
        .filter((item) => ("city" in item ? item.id : item.saved_id || item.properties.id) !== activeId)
        .sort((a, b) => (a.visit_order || 0) - (b.visit_order || 0))

      const sourcePayload = sourceItems.map((item, index) => ({
        id: "city" in item ? item.id : item.saved_id || item.properties.id,
        type: "city" in item ? ("location" as const) : ("feature" as const),
        order: index,
      }))

      await reorderItems(sourceDayId, sourcePayload)
    }

    // Update target day
    await reorderItems(targetDayId, payload)
  }

  if (!currentTrip) return <div>Loading...</div>

  return (
    <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd} collisionDetection={closestCenter}>
      <Box sx={{ height: "100vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Header */}
        <Paper
          elevation={1}
          sx={{
            p: 2,
            zIndex: 10,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderRadius: 0,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <IconButton onClick={onBack}>
              <MdArrowBack />
            </IconButton>
            <Box>
              <Typography variant="h6">{currentTrip.name}</Typography>
              <Typography variant="caption" color="text.secondary">
                {new Date(currentTrip.start_date).toLocaleDateString()} -{" "}
                {new Date(currentTrip.end_date).toLocaleDateString()}
              </Typography>
            </Box>
          </Box>
          <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
            <ToggleButtonGroup
              value={viewMode}
              exclusive
              onChange={(_, newMode) => {
                if (newMode) {
                  setViewMode(newMode)
                  if (newMode === "day" && !selectedDayId && currentTrip.days?.[0]) {
                    setSelectedDayId(currentTrip.days[0].id)
                  }
                }
              }}
              size="small"
            >
              <ToggleButton value="itinerary">
                <MdViewList style={{ marginRight: 4 }} />
                All Days
              </ToggleButton>
              <ToggleButton value="day">
                <MdCalendarToday style={{ marginRight: 4 }} />
                Day View
              </ToggleButton>
            </ToggleButtonGroup>

            {viewMode === "day" && (
              <TextField
                select
                size="small"
                value={selectedDayId}
                onChange={(e) => setSelectedDayId(e.target.value)}
                sx={{ minWidth: 200 }}
              >
                {currentTrip.days?.map((day) => (
                  <MenuItem key={day.id} value={day.id}>
                    Day {day.day_index + 1} - {new Date(day.date).toLocaleDateString()}
                  </MenuItem>
                ))}
              </TextField>
            )}
            <Button
              variant="contained"
              startIcon={<MdAdd />}
              onClick={() => {
                const message =
                  "To add an activity:\n\n" +
                  "1. Use the map to search for a location or feature\n" +
                  "2. Click on it to see details\n" +
                  "3. Click 'Add to Trip' to add it to your itinerary\n\n" +
                  "You can then drag it to the desired day and time."
                alert(message)
              }}
            >
              Add Activity
            </Button>
          </Box>
        </Paper>

        {/* Main Content - Split View */}
        <Grid container sx={{ flexGrow: 1, overflow: "hidden" }}>
          {/* Left Panel: Itinerary List */}
          <Grid item xs={12} md={7} lg={6} sx={{ height: "100%", overflowY: "auto", bgcolor: "background.default" }}>
            {viewMode === "itinerary" ? (
              <ItineraryList
                days={currentTrip.days || []}
                dayLocations={dayLocations}
                dayFeatures={dayFeatures}
                onEditItem={handleEditItem}
                onDeleteItem={handleDeleteItem}
              />
            ) : selectedDayId && currentTrip.days?.find((d) => d.id === selectedDayId) ? (
              <DayGridView
                day={currentTrip.days.find((d) => d.id === selectedDayId)!}
                locations={dayLocations[selectedDayId] || []}
                features={dayFeatures[selectedDayId] || []}
                onEditItem={handleEditItem}
                onDeleteItem={handleDeleteItem}
              />
            ) : (
              <Box sx={{ p: 3, textAlign: "center" }}>
                <Typography color="text.secondary">Select a day to view</Typography>
              </Box>
            )}
          </Grid>

          {/* Right Panel: Map */}
          <Grid item xs={12} md={5} lg={6} sx={{ height: "100%", display: { xs: "none", md: "block" } }}>
            <CanvasMap />
          </Grid>
        </Grid>

        {/* Drag Overlay */}
        <DragOverlay>{activeDragItem ? <ActivityCard item={activeDragItem} isOverlay /> : null}</DragOverlay>
      </Box>

      {/* Edit Modal */}
      <EditTimeModal
        open={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        item={editingItem}
        onSave={handleSaveEdit}
      />
    </DndContext>
  )
}

export default TripCanvas
