import { Box, Paper, Typography } from "@mui/material"
import React from "react"
import { MdLocationOn, MdPlace, MdCheckBox, MdCheckBoxOutlineBlank } from "react-icons/md"

import { DayLocation, TripFeature } from "../../contexts/TripContext"
import { getCategoryColor } from "../../utils/colorUtils"

interface CalendarItemProps {
  item: DayLocation | TripFeature
  onClick?: () => void
  isDragging?: boolean
}

export const CalendarItem: React.FC<CalendarItemProps> = ({ item, onClick, isDragging = false }) => {
  const isLocation = "city" in item
  const isVisited = item.visited !== undefined ? item.visited : true
  const isPlanned = item.planned !== undefined ? item.planned : false

  // Determine status color
  let statusColor = "grey.400"
  if (isPlanned && !isVisited) statusColor = "primary.main"
  else if (isVisited) statusColor = "success.main"
  else statusColor = "text.disabled"

  // Get category color for features
  const categoryColor = !isLocation
    ? getCategoryColor(
        (item.properties.type as string) || (item.properties.category as string) || (item.properties.amenity as string),
      )
    : "grey.400"

  const name = isLocation
    ? `${(item as DayLocation).city}, ${(item as DayLocation).country}`
    : (item as TripFeature).properties.name || "Unnamed Feature"

  const time = item.start_time || ""

  return (
    <Paper
      sx={{
        p: 1,
        mb: 1,
        cursor: "pointer",
        borderLeft: 4,
        borderLeftColor: statusColor,
        opacity: isDragging ? 0.5 : 1,
        "&:hover": {
          bgcolor: "action.hover",
        },
      }}
      onClick={onClick}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        {/* Icon */}
        <Box sx={{ color: categoryColor }}>{isLocation ? <MdLocationOn size={20} /> : <MdPlace size={20} />}</Box>

        {/* Content */}
        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
          <Typography variant="body2" noWrap sx={{ fontWeight: 500 }}>
            {name}
          </Typography>
          {time && (
            <Typography variant="caption" color="text.secondary">
              {time}
            </Typography>
          )}
        </Box>

        {/* Visit status icon */}
        <Box sx={{ color: isVisited ? "success.main" : "text.disabled" }}>
          {isVisited ? <MdCheckBox size={16} /> : <MdCheckBoxOutlineBlank size={16} />}
        </Box>
      </Box>
    </Paper>
  )
}
