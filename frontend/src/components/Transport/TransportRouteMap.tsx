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
        {/* Routes for each alternative */}
        {[...alternatives]
          .sort((a, b) => {
            // Render selected last so it's on top
            if (a.id === selectedId) return 1
            if (b.id === selectedId) return -1
            return 0
          })
          .map((alt, index) => {
            const isSelected = alt.id === selectedId
            const color = getTransportModeColor(alt.transportMode)

            // Get waypoints if available
            let positions: [number, number][] = []

            // More robust waypoint detection
            let waypointsStr = ""
            const w = alt.waypoints
            if (typeof w === "string") {
              waypointsStr = w
            } else if (w && typeof w === "object") {
              // Try common fields
              waypointsStr = w.overview || w.polyline || w.points || ""
              // If it's still empty, maybe the object IS the overview?
              if (!waypointsStr && w.points) waypointsStr = w.points
            }

            if (waypointsStr) {
              try {
                positions = decodePolyline(waypointsStr)
                // Basic validation: if we only got 1 point, it's not a valid path
                if (positions.length < 2) positions = []
              } catch (e) {
                console.error("Failed to decode polyline for alternative", alt.id, e)
              }
            }

            // Fallback: Calculate offset for each route so they don't overlap
            if (
              positions.length < 2 &&
              fromActivity.latitude &&
              fromActivity.longitude &&
              toActivity.latitude &&
              toActivity.longitude
            ) {
              const dx = toActivity.longitude - fromActivity.longitude
              const dy = toActivity.latitude - fromActivity.latitude
              const length = Math.sqrt(dx * dx + dy * dy)

              // Scale offset based on the length of the trip to keep it visible
              // but not too huge. Use 2% of the total distance or at least 0.005 degrees.
              const offsetFactor = Math.max(0.005, length * 0.03)
              const totalAlts = alternatives.length
              const offsetIndex = index - (totalAlts - 1) / 2

              if (length > 0) {
                const perpX = (-dy / length) * offsetFactor * offsetIndex
                const perpY = (dx / length) * offsetFactor * offsetIndex

                positions = [
                  [fromActivity.latitude + perpY, fromActivity.longitude + perpX],
                  [toActivity.latitude + perpY, toActivity.longitude + perpX],
                ]
              } else {
                positions = [
                  [fromActivity.latitude, fromActivity.longitude],
                  [toActivity.latitude, toActivity.longitude],
                ]
              }
            }

            if (positions.length >= 2) {
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
                    return undefined
                }
              }

              return (
                <Polyline
                  key={alt.id}
                  positions={positions}
                  pathOptions={{
                    color: color,
                    weight: isSelected ? 6 : 4,
                    opacity: isSelected ? 1 : 0.5,
                    dashArray: getDashArray(alt.transportMode),
                  }}
                  eventHandlers={{
                    click: () => onSelectAlternative(alt.id),
                  }}
                >
                  <Tooltip permanent={isSelected} direction="center" opacity={0.9} sticky={true}>
                    <div
                      style={{
                        fontSize: "11px",
                        fontWeight: isSelected ? "bold" : "normal",
                        color: isSelected ? color : "inherit",
                        backgroundColor: "white",
                        padding: "2px 4px",
                        borderRadius: "4px",
                        border: isSelected ? `1px solid ${color}` : "none",
                      }}
                    >
                      {alt.name || alt.transportMode}
                      {isSelected && (
                        <>
                          <br />
                          {alt.durationMinutes} min
                        </>
                      )}
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
