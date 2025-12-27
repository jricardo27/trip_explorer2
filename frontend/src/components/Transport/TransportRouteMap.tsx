import "leaflet/dist/leaflet.css"
import { Box } from "@mui/material"
import L from "leaflet"
import markerIcon from "leaflet/dist/images/marker-icon.png"
import markerShadow from "leaflet/dist/images/marker-shadow.png"
import { useMemo } from "react"
import { MapContainer, TileLayer, Polyline, Marker, Tooltip, useMap } from "react-leaflet"

import type { TransportAlternative, Activity } from "../../types"
import { TransportMode } from "../../types"

import { getTransportModeColor, decodePolyline } from "./transportUtils"

const DefaultIcon = L.icon({
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
})

L.Marker.prototype.options.icon = DefaultIcon

interface TransportRouteMapProps {
  alternatives: TransportAlternative[]
  selectedId: string | null
  onSelectAlternative: (id: string) => void
  fromActivity: Activity
  toActivity: Activity
}

const MapBoundsHandler = ({ fromActivity, toActivity }: { fromActivity: Activity; toActivity: Activity }) => {
  const map = useMap()

  useMemo(() => {
    if (fromActivity.latitude && fromActivity.longitude && toActivity.latitude && toActivity.longitude) {
      const bounds = L.latLngBounds(
        [fromActivity.latitude, fromActivity.longitude],
        [toActivity.latitude, toActivity.longitude],
      )
      map.fitBounds(bounds, { padding: [50, 50] })
    }
  }, [fromActivity, toActivity, map])

  return null
}

export const TransportRouteMap = ({
  alternatives,
  selectedId,
  onSelectAlternative,
  fromActivity,
  toActivity,
}: TransportRouteMapProps) => {
  const center: [number, number] =
    fromActivity.latitude && fromActivity.longitude ? [fromActivity.latitude, fromActivity.longitude] : [0, 0]

  return (
    <Box sx={{ height: "100%", width: "100%", minHeight: 400 }}>
      <MapContainer center={center} zoom={13} style={{ height: "100%", width: "100%" }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapBoundsHandler fromActivity={fromActivity} toActivity={toActivity} />

        {/* Start marker */}
        {fromActivity.latitude && fromActivity.longitude && (
          <Marker position={[fromActivity.latitude, fromActivity.longitude]} />
        )}

        {/* End marker */}
        {toActivity.latitude && toActivity.longitude && (
          <Marker position={[toActivity.latitude, toActivity.longitude]} />
        )}

        {/* Routes for each alternative */}
        {alternatives.map((alt, index) => {
          const isSelected = alt.id === selectedId
          const color = getTransportModeColor(alt.transportMode)

          // Get waypoints if available
          let positions: [number, number][] = []
          const hasWaypoints = alt.waypoints && alt.waypoints.overview

          if (hasWaypoints) {
            positions = decodePolyline(alt.waypoints.overview)
          } else if (fromActivity.latitude && fromActivity.longitude && toActivity.latitude && toActivity.longitude) {
            // Fallback: Calculate offset for each route so they don't overlap
            const offsetDistance = 0.002 // degrees (roughly 200m at equator)
            const totalAlts = alternatives.length
            const offsetIndex = index - (totalAlts - 1) / 2 // Center the offsets

            // Calculate perpendicular offset
            const dx = toActivity.longitude - fromActivity.longitude
            const dy = toActivity.latitude - fromActivity.latitude
            const length = Math.sqrt(dx * dx + dy * dy)
            const perpX = (-dy / length) * offsetDistance * offsetIndex
            const perpY = (dx / length) * offsetDistance * offsetIndex

            positions = [
              [fromActivity.latitude + perpY, fromActivity.longitude + perpX],
              [toActivity.latitude + perpY, toActivity.longitude + perpX],
            ]
          }

          if (positions.length > 0) {
            // Different dash patterns for different modes
            const getDashArray = (mode: TransportMode) => {
              switch (mode) {
                case TransportMode.WALKING:
                  return "5, 5"
                case TransportMode.CYCLING:
                  return "10, 5"
                case TransportMode.TRANSIT:
                case TransportMode.BUS:
                case TransportMode.TRAIN:
                  return "15, 5, 5, 5"
                case TransportMode.FLIGHT:
                  return "20, 10"
                default:
                  return undefined // Solid line
              }
            }

            return (
              <Polyline
                key={alt.id}
                positions={positions}
                pathOptions={{
                  color: color,
                  weight: isSelected ? 6 : 3,
                  opacity: isSelected ? 1 : 0.6,
                  dashArray: getDashArray(alt.transportMode),
                }}
                eventHandlers={{
                  click: () => onSelectAlternative(alt.id),
                }}
              >
                {/* Tooltip showing transport info */}
                <Tooltip permanent={isSelected} direction="center" opacity={0.9}>
                  <div style={{ fontSize: "12px", fontWeight: isSelected ? "bold" : "normal" }}>
                    {alt.name || alt.transportMode}
                    <br />
                    {alt.durationMinutes} min
                    {alt.cost && ` • ${alt.cost} ${alt.currency || "USD"}`}
                  </div>
                </Tooltip>
              </Polyline>
            )
          }
          return null
        })}
      </MapContainer>
    </Box>
  )
}
