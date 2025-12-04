import { Box } from "@mui/material"
import L from "leaflet"
// Fix Leaflet marker icon
import icon from "leaflet/dist/images/marker-icon.png"
import iconShadow from "leaflet/dist/images/marker-shadow.png"
import React, { useMemo } from "react"
import { Marker, Popup, useMap } from "react-leaflet"

import { useTripContext, DayLocation, TripFeature } from "../../contexts/TripContext"
import MapComponent from "../MapComponent/MapComponent"

const DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
})
L.Marker.prototype.options.icon = DefaultIcon

const FitBounds = ({ items }: { items: (DayLocation | TripFeature)[] }) => {
  const map = useMap()

  React.useEffect(() => {
    if (items.length === 0) return

    const bounds = L.latLngBounds([])
    items.forEach((item) => {
      if ("city" in item) {
        if (item.latitude && item.longitude) bounds.extend([item.latitude, item.longitude])
      } else {
        const [lng, lat] = item.geometry.coordinates
        bounds.extend([lat, lng])
      }
    })

    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [50, 50] })
    }
  }, [items, map])

  return null
}

const CanvasMap: React.FC = () => {
  const { dayLocations, dayFeatures } = useTripContext()

  const allItems = useMemo(() => {
    const locations = Object.values(dayLocations).flat()
    const features = Object.values(dayFeatures).flat()
    return [...locations, ...features]
  }, [dayLocations, dayFeatures])

  return (
    <Box sx={{ height: "100%", width: "100%", position: "relative" }}>
      <MapComponent center={[0, 0]}>
        <FitBounds items={allItems} />
        {allItems.map((item) => {
          const isLocation = "city" in item
          const id = isLocation ? item.id : item.saved_id || item.properties.id

          let position: [number, number] | null = null

          if (isLocation) {
            if (item.latitude && item.longitude) {
              position = [item.latitude, item.longitude]
            }
          } else {
            if (item.geometry && item.geometry.coordinates && item.geometry.coordinates.length >= 2) {
              position = [item.geometry.coordinates[1], item.geometry.coordinates[0]]
            }
          }

          if (!position || !position[0] || !position[1]) return null

          return (
            <Marker key={id} position={position}>
              <Popup>{isLocation ? item.city : item.properties.title || item.properties.name || "Untitled"}</Popup>
            </Marker>
          )
        })}
      </MapComponent>
    </Box>
  )
}

export default CanvasMap
