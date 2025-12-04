import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, closestCenter } from "@dnd-kit/core"
import { Box, Typography } from "@mui/material"
import React, { useState, useMemo, useRef } from "react"

import { DayLocation, Trip, TripFeature } from "../../contexts/TripContext"

import { CalendarDayColumn, CalendarDayHeader } from "./CalendarDayCell"
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

  const headerRef = useRef<HTMLDivElement>(null)
  const bodyRef = useRef<HTMLDivElement>(null)

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
    // Handle reordering within the same day
    if (fromDayId === toDayId) {
      const items = dayItems[fromDayId] || []
      const activeId = "city" in activeItem.item ? activeItem.item.id : activeItem.item.saved_id || activeItem.item.properties.id

      // Find current index
      const oldIndex = items.findIndex(item => {
        const id = "city" in item ? item.id : item.saved_id || item.properties.id
        return id === activeId
      })

      if (oldIndex === -1) return

      let newIndex = -1

      // If dropped over a day column (empty space or end of list)
      if (over.id === fromDayId) {
        newIndex = items.length - 1
      } else {
        // If dropped over another item
        const overId = over.id as string
        const overIndex = items.findIndex(item => {
          const id = "city" in item ? item.id : item.saved_id || item.properties.id
          return id === overId
        })

        if (overIndex !== -1) {
          newIndex = overIndex
        }
      }

      if (newIndex !== -1 && newIndex !== oldIndex) {
        await onItemMoved(activeId, activeItem.type, fromDayId, toDayId, newIndex)
      }
    }

    setActiveItem(null)
  }

  const handleScroll = () => {
    if (headerRef.current && bodyRef.current) {
      headerRef.current.scrollLeft = bodyRef.current.scrollLeft
    }
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
          flexDirection: "column",
          height: "calc(100vh - 200px)",
          border: 1,
          borderColor: "divider",
          bgcolor: "background.default",
        }}
      >
        {/* Fixed Header Row */}
        <Box
          ref={headerRef}
          sx={{
            display: "flex",
            overflow: "hidden", // Hide scrollbar, controlled by body scroll
            ml: "60px", // Offset for TimeGrid width
            borderBottom: 1,
            borderColor: "divider",
            bgcolor: "background.paper",
            flexShrink: 0,
          }}
        >
          {trip.days.map((day) => (
            <CalendarDayHeader key={day.id} day={day} />
          ))}
        </Box>

        {/* Scrollable Body */}
        <Box
          ref={bodyRef}
          onScroll={handleScroll}
          sx={{
            display: "flex",
            overflow: "auto",
            flexGrow: 1,
          }}
        >
          {/* Sticky Time Axis */}
          <Box sx={{ position: "sticky", left: 0, zIndex: 10, bgcolor: "background.default" }}>
            <TimeGrid pixelsPerMinute={pixelsPerMinute} />
          </Box>

          {/* Day Columns */}
          <Box sx={{ display: "flex" }}>
            {trip.days.map((day) => (
              <CalendarDayColumn
                key={day.id}
                day={day}
                items={dayItems[day.id] || []}
                onItemClick={(item) => onItemClick(item, "city" in item ? "location" : "feature")}
                pixelsPerMinute={pixelsPerMinute}
              />
            ))}
          </Box>
        </Box>
      </Box>

      <DragOverlay>{activeItem && <CalendarItem item={activeItem.item} isDragging />}</DragOverlay>
    </DndContext>
  )
}
