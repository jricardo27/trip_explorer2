import { Box, Paper, Typography, Chip } from "@mui/material"
import React from "react"
import {
  MdLocationOn,
  MdPlace,
  MdCheckBox,
  MdCheckBoxOutlineBlank,
  MdDirectionsCar,
  MdDirectionsTransit,
  MdDirectionsBus,
  MdFlight,
  MdDirectionsBoat,
  MdDirectionsWalk,
  MdDirectionsBike,
} from "react-icons/md"

import { DayLocation, TripFeature } from "../../contexts/TripContext"
import { getCategoryColor } from "../../utils/colorUtils"
import { calculateEndTime } from "../../utils/timeUtils"

interface CalendarItemProps {
  item: DayLocation | TripFeature
  onClick?: () => void
  isDragging?: boolean
}

const getTransportIcon = (mode: string | undefined) => {
  switch (mode?.toLowerCase()) {
    case "car":
      return <MdDirectionsCar size={14} />
    case "train":
      return <MdDirectionsTransit size={14} />
    case "bus":
      return <MdDirectionsBus size={14} />
    case "flight":
      return <MdFlight size={14} />
    case "ferry":
      return <MdDirectionsBoat size={14} />
    case "walk":
      return <MdDirectionsWalk size={14} />
    case "bike":
      return <MdDirectionsBike size={14} />
    default:
      return null
  }
}

const formatDuration = (minutes: number): string => {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (hours > 0 && mins > 0) return `${hours}h ${mins}m`
  if (hours > 0) return `${hours}h`
  return `${mins}m`
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

  const startTime = item.start_time || ""
  const endTime =
    item.end_time || (startTime && item.duration_minutes ? calculateEndTime(startTime, item.duration_minutes) : "")
  const timeRange =
    startTime && endTime ? `${startTime.slice(0, 5)} - ${endTime.slice(0, 5)}` : startTime ? startTime.slice(0, 5) : ""

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
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
            {timeRange && (
              <Typography variant="caption" color="text.secondary">
                {timeRange}
              </Typography>
            )}
            {item.duration_minutes && (
              <Chip
                label={formatDuration(item.duration_minutes)}
                size="small"
                sx={{ height: 18, fontSize: "0.7rem" }}
              />
            )}
            {item.transport_mode && (
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, color: "text.secondary" }}>
                {getTransportIcon(item.transport_mode)}
                <Typography variant="caption" sx={{ textTransform: "capitalize" }}>
                  {item.transport_mode}
                </Typography>
              </Box>
            )}
          </Box>
        </Box>

        {/* Visit status icon */}
        <Box sx={{ color: isVisited ? "success.main" : "text.disabled" }}>
          {isVisited ? <MdCheckBox size={16} /> : <MdCheckBoxOutlineBlank size={16} />}
        </Box>
      </Box>
    </Paper>
  )
}
