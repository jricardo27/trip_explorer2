import {
  DirectionsCar,
  DirectionsBus,
  DirectionsWalk,
  Train,
  Flight,
  DirectionsBoat,
  PedalBike,
} from "@mui/icons-material"
import { Tooltip, Paper, Typography } from "@mui/material"
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

  // Helper to format duration
  const formatDuration = (mins: number) => {
    const h = Math.floor(mins / 60)
    const m = mins % 60
    return h > 0 ? `${h}h ${m}m` : `${m}m`
  }

  // Calculate day end boundary (assuming dayDate is start of day)
  const dayStart = dayjs(dayDate).startOf("day")
  const dayEnd = dayStart.add(1, "day")

  // Calculate transport end
  const endTime = startTime.add(transport.durationMinutes, "minute")

  // Check for overflow
  const isOverflow = endTime.isAfter(dayEnd)
  const overflowMinutes = isOverflow ? endTime.diff(dayEnd, "minute") : 0

  // Clamp visual height to day end if overflown
  // Actual displayed duration in this day
  const displayedMinutes = isOverflow ? dayEnd.diff(startTime, "minute") : transport.durationMinutes

  const height = Math.max((displayedMinutes / 60) * hourHeight, 20)
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
          height: `${height}px`,
          bgcolor: "secondary.light",
          color: "secondary.contrastText",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 50,
          cursor: onTransportClick ? "pointer" : "help",
          border: "1px dashed",
          borderColor: "secondary.main",
          overflow: "hidden",
          borderBottomRightRadius: isOverflow ? 0 : 4,
          borderBottomLeftRadius: isOverflow ? 0 : 4,
          borderBottom: isOverflow ? "none" : undefined,
          "&:hover": onTransportClick
            ? {
                bgcolor: "secondary.main",
                transform: "scale(1.05)",
              }
            : {},
        }}
      >
        {getTransportIcon(transport.transportMode)}
        {isOverflow && (
          <Typography
            variant="caption"
            sx={{
              fontSize: "0.65rem",
              lineHeight: 1,
              mt: 0.5,
              textAlign: "center",
              bgcolor: "rgba(0,0,0,0.1)",
              width: "100%",
              p: 0.5,
            }}
          >
            +{formatDuration(overflowMinutes)} &rarr;
          </Typography>
        )}
      </Paper>
    </Tooltip>
  )
}
