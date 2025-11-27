import L from "leaflet"
import React, { useMemo } from "react"
import { Marker } from "react-leaflet"

import { DayLocation, Trip } from "../../contexts/TripContext"

interface TripRouteLayerProps {
  currentTrip: Trip | null
  dayLocations: Record<string, DayLocation[]>
}

const TripRouteLayer: React.FC<TripRouteLayerProps> = ({ currentTrip, dayLocations }) => {
  // const map = useMap()

  const allLocations = useMemo(() => {
    if (!currentTrip || !currentTrip.days) return []
    const locs: DayLocation[] = []
    currentTrip.days.forEach((day) => {
      const dayLocs = dayLocations[day.id] || []
      locs.push(...dayLocs)
    })
    return locs
  }, [currentTrip, dayLocations])

  if (!currentTrip) return null

  return (
    <>
      {allLocations.map(
        (loc) =>
          loc.latitude &&
          loc.longitude && (
            <Marker
              key={loc.id}
              position={[Number(loc.latitude), Number(loc.longitude)]}
              icon={L.divIcon({
                className: "location-marker",
                html: `<div style="
                background: white;
                border: 2px solid blue;
                border-radius: 50%;
                width: 24px;
                height: 24px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-weight: bold;
                font-size: 12px;
              ">${loc.visit_order}</div>`,
                iconSize: [24, 24],
                iconAnchor: [12, 12],
              })}
            >
              {/* Popup would require importing Popup from react-leaflet */}
            </Marker>
          ),
      )}
    </>
  )
}

export default TripRouteLayer
