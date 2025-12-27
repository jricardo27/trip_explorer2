import "leaflet/dist/leaflet.css"
import { Box } from "@mui/material"
import L from "leaflet"
import markerIcon from "leaflet/dist/images/marker-icon.png"
import markerShadow from "leaflet/dist/images/marker-shadow.png"
import { useMemo } from "react"
import { MapContainer, TileLayer, Polyline, Marker, useMap } from "react-leaflet"

import type { TransportAlternative, Activity } from "../../types"

import { getTransportModeColor } from "./transportUtils"

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
        {alternatives.map((alt) => {
          const isSelected = alt.id === selectedId
          const color = getTransportModeColor(alt.transportMode)

          // For now, draw simple straight line between points
          // In future, we can use actual route polylines if available
          if (fromActivity.latitude && fromActivity.longitude && toActivity.latitude && toActivity.longitude) {
            return (
              <Polyline
                key={alt.id}
                positions={[
                  [fromActivity.latitude, fromActivity.longitude],
                  [toActivity.latitude, toActivity.longitude],
                ]}
                pathOptions={{
                  color: color,
                  weight: isSelected ? 6 : 3,
                  opacity: isSelected ? 1 : 0.6,
                }}
                eventHandlers={{
                  click: () => onSelectAlternative(alt.id),
                }}
              />
            )
          }
          return null
        })}
      </MapContainer>
    </Box>
  )
}
