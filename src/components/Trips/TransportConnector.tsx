import { Box, Typography, IconButton, Tooltip } from "@mui/material"
import React from "react"
import {
  MdDirectionsCar,
  MdDirectionsTransit,
  MdDirectionsBus,
  MdFlight,
  MdDirectionsBoat,
  MdDirectionsWalk,
  MdDirectionsBike,
  MdMoreHoriz,
} from "react-icons/md"

import { DayLocation, TripFeature } from "../../contexts/TripContext"
import { formatTravelTime } from "../../utils/distanceUtils"

interface TransportConnectorProps {
  item: DayLocation | TripFeature
  distance?: number
  onClick: () => void
}

const getTransportIcon = (mode: string | undefined) => {
  switch (mode?.toLowerCase()) {
    case "car":
      return <MdDirectionsCar />
    case "train":
      return <MdDirectionsTransit />
    case "bus":
      return <MdDirectionsBus />
    case "flight":
      return <MdFlight />
    case "ferry":
      return <MdDirectionsBoat />
    case "walk":
      return <MdDirectionsWalk />
    case "bike":
      return <MdDirectionsBike />
    default:
      return <MdMoreHoriz />
  }
}

export const TransportConnector: React.FC<TransportConnectorProps> = ({ item, distance, onClick }) => {
  const hasTransportInfo = item.transport_mode || item.travel_time_minutes || item.transport_cost

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1,
        py: 0.5,
        px: 2,
        bgcolor: hasTransportInfo ? "action.hover" : "transparent",
        borderLeft: 3,
        borderLeftColor: "divider",
        ml: 1,
        cursor: "pointer",
        transition: "background-color 0.2s",
        "&:hover": {
          bgcolor: "action.selected",
        },
      }}
      onClick={onClick}
    >
      {/* Vertical connector line */}
      <Box
        sx={{
          width: 2,
          height: 20,
          bgcolor: "divider",
          mr: 1,
        }}
      />

      {/* Transport icon */}
      <Tooltip title="Click to edit transport details">
        <IconButton size="small" sx={{ p: 0.5 }}>
          {getTransportIcon(item.transport_mode)}
        </IconButton>
      </Tooltip>

      {/* Transport info */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 2, flexGrow: 1 }}>
        {distance !== undefined && (
          <Typography variant="caption" color="text.secondary">
            {distance < 1 ? `${Math.round(distance * 1000)}m` : `${distance.toFixed(1)}km`}
          </Typography>
        )}

        {item.transport_mode && (
          <Typography variant="caption" color="text.secondary" sx={{ textTransform: "capitalize" }}>
            {item.transport_mode}
          </Typography>
        )}

        {item.travel_time_minutes && (
          <Typography variant="caption" color="text.secondary">
            ~{formatTravelTime(item.travel_time_minutes)}
          </Typography>
        )}

        {item.transport_cost && (
          <Typography variant="caption" color="text.secondary">
            ${item.transport_cost}
          </Typography>
        )}

        {!hasTransportInfo && (
          <Typography variant="caption" color="text.disabled" sx={{ fontStyle: "italic" }}>
            Click to add transport details
          </Typography>
        )}
      </Box>
    </Box>
  )
}
