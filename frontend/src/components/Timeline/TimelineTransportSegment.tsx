import {
  DirectionsCar,
  DirectionsBus,
  DirectionsWalk,
  Train,
  Flight,
  DirectionsBoat,
  PedalBike,
} from "@mui/icons-material"
import { Tooltip, Paper } from "@mui/material"
import dayjs from "dayjs"

import { TransportMode } from "../../types"
import type { Activity, TransportAlternative } from "../../types"

import { getPixelPosition } from "./TimelineUtils"

interface TimelineTransportSegmentProps {
  transport: TransportAlternative
  fromActivity: Activity
  dayDate: string
  hourHeight: number
  onTransportClick?: (transport: TransportAlternative) => void
}

const getTransportIcon = (mode: TransportMode) => {
  switch (mode) {
    case TransportMode.DRIVING:
      return <DirectionsCar fontSize="small" />
    case TransportMode.WALKING:
      return <DirectionsWalk fontSize="small" />
    case TransportMode.CYCLING:
      return <PedalBike fontSize="small" />
    case TransportMode.TRANSIT:
      return <DirectionsBus fontSize="small" />
    case TransportMode.BUS:
      return <DirectionsBus fontSize="small" />
    case TransportMode.TRAIN:
      return <Train fontSize="small" />
    case TransportMode.FLIGHT:
      return <Flight fontSize="small" />
    case TransportMode.FERRY:
      return <DirectionsBoat fontSize="small" />
    default:
      return <DirectionsCar fontSize="small" />
  }
}

export const TimelineTransportSegment = ({
  transport,
  fromActivity,
  dayDate,
  hourHeight,
  onTransportClick,
}: TimelineTransportSegmentProps) => {
  if (!fromActivity.scheduledStart) return null

  const startBasis = fromActivity.scheduledEnd || dayjs(fromActivity.scheduledStart).add(1, "hour").toISOString()
  const startTime = dayjs(startBasis)

  const top = getPixelPosition(startTime.toISOString(), dayDate, hourHeight)
  const height = (transport.durationMinutes / 60) * hourHeight

  const width = 15 // %
  const left = 85 // %

  return (
    <Tooltip title={`${transport.transportMode}: ${transport.durationMinutes} min`}>
      <Paper
        onClick={() => onTransportClick?.(transport)}
        sx={{
          position: "absolute",
          top: `${top}px`,
          left: `${left}%`,
          width: `${width}%`,
          height: `${Math.max(height, 20)}px`,
          bgcolor: "secondary.light",
          color: "secondary.contrastText",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 50,
          cursor: onTransportClick ? "pointer" : "help",
          border: "1px dashed",
          borderColor: "secondary.main",
          overflow: "hidden",
          "&:hover": onTransportClick
            ? {
                bgcolor: "secondary.main",
                transform: "scale(1.05)",
              }
            : {},
        }}
      >
        {getTransportIcon(transport.transportMode)}
      </Paper>
    </Tooltip>
  )
}
