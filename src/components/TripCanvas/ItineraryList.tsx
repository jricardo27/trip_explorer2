import { Box, Stack } from "@mui/material"
import React from "react"

import { TripDay, DayLocation, TripFeature } from "../../contexts/TripContext"

import DaySection from "./DaySection"

interface ItineraryListProps {
  days: TripDay[]
  dayLocations: Record<string, DayLocation[]>
  dayFeatures: Record<string, TripFeature[]>
  onEditItem?: (item: DayLocation | TripFeature) => void
  onDeleteItem?: (item: DayLocation | TripFeature, dayId: string) => void
}

const ItineraryList: React.FC<ItineraryListProps> = ({ days, dayLocations, dayFeatures, onEditItem, onDeleteItem }) => {
  return (
    <Box sx={{ p: 3, maxWidth: 800, mx: "auto" }}>
      <Stack spacing={4}>
        {days.map((day) => (
          <DaySection
            key={day.id}
            day={day}
            locations={dayLocations[day.id] || []}
            features={dayFeatures[day.id] || []}
            onEditItem={onEditItem}
            onDeleteItem={onDeleteItem}
          />
        ))}
      </Stack>
    </Box>
  )
}

export default ItineraryList
