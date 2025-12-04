import DirectionsBikeIcon from "@mui/icons-material/DirectionsBike"
import DirectionsCarIcon from "@mui/icons-material/DirectionsCar"
import DirectionsTransitIcon from "@mui/icons-material/DirectionsTransit"
import DirectionsWalkIcon from "@mui/icons-material/DirectionsWalk"
import FlightIcon from "@mui/icons-material/Flight"
import MoreHorizIcon from "@mui/icons-material/MoreHoriz"
import { Box, Typography, IconButton, Tooltip } from "@mui/material"
import React, { useState } from "react"

import TransportAlternativesPanel from "../Transport/TransportAlternativesPanel"

interface TransportConnectorProps {
  tripId: string
  fromActivityId: string
  toActivityId: string
  transportMode?: string
  durationMinutes?: number
  cost?: number
  currency?: string
  onUpdate?: () => void
}

const getTransportIcon = (mode: string) => {
  switch (mode) {
    case "driving":
      return <DirectionsCarIcon fontSize="small" />
    case "walking":
      return <DirectionsWalkIcon fontSize="small" />
    case "cycling":
      return <DirectionsBikeIcon fontSize="small" />
    case "transit":
      return <DirectionsTransitIcon fontSize="small" />
    case "flight":
      return <FlightIcon fontSize="small" />
    default:
      return <DirectionsCarIcon fontSize="small" />
  }
}

const TransportConnector: React.FC<TransportConnectorProps> = ({
  tripId,
  fromActivityId,
  toActivityId,
  transportMode,
  durationMinutes,
  cost,
  currency,
  onUpdate,
}) => {
  const [panelOpen, setPanelOpen] = useState(false)

  const hasTransport = !!transportMode

  return (
    <>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          py: 1,
          px: 2,
          ml: 4,
          borderLeft: "2px dashed #ccc",
          position: "relative",
        }}
      >
        <Box
          sx={{
            position: "absolute",
            left: -11,
            top: "50%",
            marginTop: "-10px",
            bgcolor: "background.paper",
          }}
        >
          <IconButton
            size="small"
            onClick={() => setPanelOpen(true)}
            sx={{
              border: "1px solid #e0e0e0",
              width: 20,
              height: 20,
              p: 0,
            }}
          >
            <MoreHorizIcon sx={{ fontSize: 14 }} />
          </IconButton>
        </Box>

        {hasTransport ? (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              cursor: "pointer",
              "&:hover": { bgcolor: "action.hover", borderRadius: 1 },
            }}
            onClick={() => setPanelOpen(true)}
          >
            <Box sx={{ color: "text.secondary", mr: 1, display: "flex" }}>{getTransportIcon(transportMode)}</Box>
            <Typography variant="caption" color="text.secondary">
              {durationMinutes} min • {currency} {cost}
            </Typography>
          </Box>
        ) : (
          <Tooltip title="Add transport">
            <Typography
              variant="caption"
              color="text.disabled"
              sx={{ cursor: "pointer", fontStyle: "italic" }}
              onClick={() => setPanelOpen(true)}
            >
              Add transport...
            </Typography>
          </Tooltip>
        )}
      </Box>

      <TransportAlternativesPanel
        tripId={tripId}
        fromActivityId={fromActivityId}
        toActivityId={toActivityId}
        isOpen={panelOpen}
        onClose={() => setPanelOpen(false)}
        onTransportSelected={() => {
          if (onUpdate) onUpdate()
        }}
      />
    </>
  )
}

export { TransportConnector }
