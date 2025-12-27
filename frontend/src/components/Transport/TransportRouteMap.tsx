import "leaflet/dist/leaflet.css"
import { Box } from "@mui/material"
import L from "leaflet"
import markerIcon from "leaflet/dist/images/marker-icon.png"
import markerShadow from "leaflet/dist/images/marker-shadow.png"
import { useEffect, Fragment } from "react"
import { MapContainer, TileLayer, Polyline, Marker, Tooltip, useMap, CircleMarker } from "react-leaflet"

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

  useEffect(() => {
    if (fromActivity.latitude && fromActivity.longitude && toActivity.latitude && toActivity.longitude) {
      const bounds = L.latLngBounds(
        [Number(fromActivity.latitude), Number(fromActivity.longitude)],
        [Number(toActivity.latitude), Number(toActivity.longitude)],
      )
      map.fitBounds(bounds, { padding: [50, 50] })
    }
  }, [fromActivity, toActivity, map])

  return null
}

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

export const TransportRouteMap = ({
  alternatives,
  selectedId,
  onSelectAlternative,
  fromActivity,
  toActivity,
}: TransportRouteMapProps) => {
  const center: [number, number] =
    fromActivity.latitude && fromActivity.longitude
      ? [Number(fromActivity.latitude), Number(fromActivity.longitude)]
      : [0, 0]

  const sortedAlternatives = [...alternatives].sort((a, b) => {
    // Render selected last so it's on top
    if (a.id === selectedId) return 1
    if (b.id === selectedId) return -1
    return 0
  })

  // Group alternatives into those with waypoints and those without (for offset calculation)
  const alternativesWithNoWaypoints = sortedAlternatives.filter((alt) => {
    const w = alt.waypoints as any
    if (!w) return true
    if (w.segments && Array.isArray(w.segments) && w.segments.length > 0) return false
    if (typeof w === "string" && w.length > 5) return false
    if (w.overview || w.polyline || w.points || w.overview_polyline?.points || w.overview_polyline) return false
    return true
  })

  return (
    <Box sx={{ height: "100%", width: "100%", minHeight: 400 }}>
      <MapContainer center={center} zoom={13} style={{ height: "100%", width: "100%" }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapBoundsHandler fromActivity={fromActivity} toActivity={toActivity} />

        {/* Activities markers */}
        {fromActivity.latitude && fromActivity.longitude && (
          <Marker position={[Number(fromActivity.latitude), Number(fromActivity.longitude)]} />
        )}
        {toActivity.latitude && toActivity.longitude && (
          <Marker position={[Number(toActivity.latitude), Number(toActivity.longitude)]} />
        )}

        {sortedAlternatives.map((alt) => {
          const isSelected = alt.id === selectedId
          const color = getTransportModeColor(alt.transportMode)
          const w = alt.waypoints as any

          // 1. Try to get segments
          let segments: [number, number][][] = []

          if (w) {
            if (w.segments && Array.isArray(w.segments)) {
              segments = w.segments
                .map((s: any) => decodePolyline(typeof s === "string" ? s : s.polyline || s.points))
                .filter((p: any) => p.length >= 2)
            } else {
              let encoded = ""
              if (typeof w === "string") {
                if (w.startsWith("{")) {
                  try {
                    const p = JSON.parse(w)
                    encoded =
                      p.overview || p.polyline || p.points || p.overview_polyline?.points || p.overview_polyline || ""
                  } catch {
                    encoded = w
                  }
                } else {
                  encoded = w
                }
              } else {
                encoded =
                  w.overview || w.polyline || w.points || w.overview_polyline?.points || w.overview_polyline || ""
              }

              if (encoded && typeof encoded === "string") {
                const points = decodePolyline(encoded)
                if (points.length >= 2) segments = [points]
              }
            }
          }

          // 2. Fallback if no segments were found
          if (segments.length === 0) {
            if (fromActivity.latitude && fromActivity.longitude && toActivity.latitude && toActivity.longitude) {
              const dx = toActivity.longitude - fromActivity.longitude
              const dy = toActivity.latitude - fromActivity.latitude
              const length = Math.sqrt(dx * dx + dy * dy)

              // Subtle offset for visual separation
              const offsetFactor = 0.005
              const fallbackIndex = alternativesWithNoWaypoints.findIndex((a) => a.id === alt.id)
              const offsetIndex =
                fallbackIndex === -1 ? 0 : fallbackIndex - (alternativesWithNoWaypoints.length - 1) / 2

              if (length > 0) {
                const perpX = (-dy / length) * offsetFactor * offsetIndex
                const perpY = (dx / length) * offsetFactor * offsetIndex

                segments = [
                  [
                    [Number(fromActivity.latitude) + perpY, Number(fromActivity.longitude) + perpX],
                    [Number(toActivity.latitude) + perpY, Number(toActivity.longitude) + perpX],
                  ],
                ]
              } else {
                segments = [
                  [
                    [Number(fromActivity.latitude), Number(fromActivity.longitude)],
                    [Number(toActivity.latitude), Number(toActivity.longitude)],
                  ],
                ]
              }
            }
          }

          // 3. Render all segments and waypoints for this alternative
          return (
            <Fragment key={alt.id}>
              {segments.map((points, segIdx) => (
                <Polyline
                  key={`${alt.id}-seg-${segIdx}`}
                  positions={points}
                  pathOptions={{
                    color: color,
                    weight: isSelected ? 6 : 4,
                    opacity: isSelected ? 1 : 0.5,
                    dashArray: getDashArray(alt.transportMode),
                    lineCap: "round",
                    lineJoin: "round",
                  }}
                  eventHandlers={{
                    click: () => onSelectAlternative(alt.id),
                  }}
                >
                  {segIdx === 0 && (
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
                  )}
                </Polyline>
              ))}
              {/* Render waypoints at segment junctions */}
              {segments.length > 1 &&
                segments.slice(0, -1).map((segment, segIdx) => {
                  const waypoint = segment[segment.length - 1] // End of the segment
                  return (
                    <CircleMarker
                      key={`${alt.id}-waypoint-${segIdx}`}
                      center={waypoint}
                      radius={isSelected ? 5 : 3}
                      pathOptions={{
                        color: isSelected ? "black" : color,
                        weight: 1,
                        fillColor: color,
                        fillOpacity: isSelected ? 1 : 0.7,
                      }}
                    />
                  )
                })}
            </Fragment>
          )
        })}
      </MapContainer>
    </Box>
  )
}
