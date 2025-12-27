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

export const getTransportModeColor = (mode: TransportMode): string => {
  switch (mode) {
    case TransportMode.DRIVING:
      return "#1976d2" // Blue
    case TransportMode.WALKING:
      return "#2e7d32" // Green
    case TransportMode.CYCLING:
      return "#ed6c02" // Orange
    case TransportMode.TRANSIT:
    case TransportMode.BUS:
      return "#9c27b0" // Purple
    case TransportMode.TRAIN:
      return "#d32f2f" // Red
    case TransportMode.FLIGHT:
      return "#0288d1" // Light Blue
    case TransportMode.FERRY:
      return "#00796b" // Teal
    default:
      return "#757575" // Grey
  }
}

export const decodePolyline = (encoded: string): [number, number][] => {
  const points: [number, number][] = []
  let index = 0
  const len = encoded.length
  let lat = 0,
    lng = 0

  while (index < len) {
    let b,
      shift = 0,
      result = 0
    do {
      b = encoded.charCodeAt(index++) - 63
      result |= (b & 0x1f) << shift
      shift += 5
    } while (b >= 0x20)
    const dlat = result & 1 ? ~(result >> 1) : result >> 1
    lat += dlat

    shift = 0
    result = 0
    do {
      b = encoded.charCodeAt(index++) - 63
      result |= (b & 0x1f) << shift
      shift += 5
    } while (b >= 0x20)
    const dlng = result & 1 ? ~(result >> 1) : result >> 1
    lng += dlng

    points.push([lat / 1e5, lng / 1e5])
  }

  return points
}
