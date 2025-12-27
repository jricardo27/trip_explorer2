import {
  DirectionsCar,
  DirectionsBus,
  DirectionsWalk,
  Train,
  Flight,
  DirectionsBoat,
  PedalBike,
  HelpOutline,
} from "@mui/icons-material"

import { TransportMode } from "../../types"

export const getTransportIcon = (mode: TransportMode) => {
  switch (mode) {
    case TransportMode.DRIVING:
      return <DirectionsCar />
    case TransportMode.WALKING:
      return <DirectionsWalk />
    case TransportMode.CYCLING:
      return <PedalBike />
    case TransportMode.TRANSIT:
      return <DirectionsBus />
    case TransportMode.BUS:
      return <DirectionsBus />
    case TransportMode.TRAIN:
      return <Train />
    case TransportMode.FLIGHT:
      return <Flight />
    case TransportMode.FERRY:
      return <DirectionsBoat />
    default:
      return <HelpOutline />
  }
}

export const getModeLabel = (mode: TransportMode) => {
  return mode.charAt(0).toUpperCase() + mode.slice(1).toLowerCase()
}

export const formatDuration = (minutes: number, t: any) => {
  if (!minutes) return "0 min"
  const d = Math.floor(minutes / (24 * 60))
  const h = Math.floor((minutes % (24 * 60)) / 60)
  const m = minutes % 60

  const parts = []
  if (d > 0) parts.push(`${d} ${t("days") || "days"}`)
  if (h > 0) parts.push(`${h} h`)
  if (m > 0 || parts.length === 0) parts.push(`${m} min`)

  return parts.join(" ")
}
