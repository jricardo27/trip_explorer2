import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, closestCenter } from "@dnd-kit/core"
import { Box, Typography } from "@mui/material"
import React, { useState, useMemo } from "react"

import { DayLocation, Trip, TripFeature } from "../../contexts/TripContext"

import { CalendarDayCell } from "./CalendarDayCell"
import { CalendarItem } from "./CalendarItem"
import { TimeGrid } from "./TimeGrid"

interface TripCalendarViewProps {
  trip: Trip
  dayLocations: Record<string, DayLocation[]>
  dayFeatures: Record<string, TripFeature[]>
  onItemMoved: (
    itemId: string,
    itemType: "location" | "feature",
    fromDayId: string,
    toDayId: string,
    newOrder: number,
  ) => Promise<void>
  onItemClick: (item: DayLocation | TripFeature, type: "location" | "feature") => void
}

export const TripCalendarView: React.FC<TripCalendarViewProps> = ({
  trip,
  dayLocations,
  dayFeatures,
  onItemMoved,
  onItemClick,
}) => {
  const [activeItem, setActiveItem] = useState<{
    item: DayLocation | TripFeature
    type: "location" | "feature"
  } | null>(null)

  const pixelsPerMinute = 2

  // Combine locations and features for each day
  const dayItems = useMemo(() => {
    const result: Record<string, (DayLocation | TripFeature)[]> = {}
    trip.days?.forEach((day) => {
      const locations = dayLocations[day.id] || []
      const features = dayFeatures[day.id] || []
      // Combine and sort by visit_order
      const combined = [...locations, ...features].sort((a, b) => (a.visit_order || 0) - (b.visit_order || 0))
      result[day.id] = combined
    })
    return result
  }, [trip.days, dayLocations, dayFeatures])

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event
    const data = active.data.current as { item: DayLocation | TripFeature; dayId: string; itemId: string }
    const itemType = "city" in data.item ? "location" : "feature"
    setActiveItem({ item: data.item, type: itemType })
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event

    if (!over || !activeItem) {
      setActiveItem(null)
      return
    }

    const activeData = active.data.current as { item: DayLocation | TripFeature; dayId: string; itemId: string }
    const fromDayId = activeData.dayId
    const toDayId = over.id as string

    // If dropped on a different day
    if (fromDayId !== toDayId) {
      const targetDayItems = dayItems[toDayId] || []
      const newOrder = targetDayItems.length // Add to end

      const itemId = "city" in activeItem.item ? activeItem.item.id : activeItem.item.saved_id || ""

      if (itemId) {
        await onItemMoved(itemId, activeItem.type, fromDayId, toDayId, newOrder)
      }
    }
    // TODO: Handle reordering within the same day

    setActiveItem(null)
  }

  if (!trip.days || trip.days.length === 0) {
    return (
      <Box sx={{ p: 4, textAlign: "center" }}>
        <Typography variant="h6" color="text.secondary">
          No days in this trip
        </Typography>
      </Box>
    )
  }

  return (
    <DndContext collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <Box
        sx={{
          display: "flex",
          height: "calc(100vh - 200px)",
          overflow: "auto",
        }}
      >
        {/* Time Axis */}
        <TimeGrid pixelsPerMinute={pixelsPerMinute} />

        {/* Day Columns */}
        <Box
          sx={{
            display: "flex",
            gap: 2,
            p: 2,
            flexGrow: 1,
          }}
        >
          {trip.days.map((day) => (
            <CalendarDayCell
              key={day.id}
              day={day}
              items={dayItems[day.id] || []}
              onItemClick={(item) => onItemClick(item, "city" in item ? "location" : "feature")}
              pixelsPerMinute={pixelsPerMinute}
            />
          ))}
        </Box>
      </Box>

      <DragOverlay>{activeItem && <CalendarItem item={activeItem.item} isDragging />}</DragOverlay>
    </DndContext>
  )
}
