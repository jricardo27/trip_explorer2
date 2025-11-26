import L from "leaflet"
import React, { useMemo } from "react"
import { Marker, Polyline } from "react-leaflet"

import { DayLocation, Trip } from "../../contexts/TripContext"

interface TripRouteLayerProps {
  currentTrip: Trip | null
  dayLocations: Record<string, DayLocation[]>
}

const TripRouteLayer: React.FC<TripRouteLayerProps> = ({ currentTrip, dayLocations }) => {
  // const map = useMap()

  const routeSegments = useMemo(() => {
    if (!currentTrip || !currentTrip.days) return []

    const segments: { start: [number, number]; end: [number, number]; angle: number }[] = []
    let previousLocation: DayLocation | null = null

    // Sort days by index
    const sortedDays = [...currentTrip.days].sort((a, b) => a.day_index - b.day_index)

    sortedDays.forEach((day) => {
      const locations = dayLocations[day.id] || []
      // Sort locations by visit_order
      const sortedLocations = [...locations].sort((a, b) => a.visit_order - b.visit_order)

      sortedLocations.forEach((location) => {
        if (location.latitude && location.longitude) {
          if (previousLocation && previousLocation.latitude && previousLocation.longitude) {
            const start: [number, number] = [Number(previousLocation.latitude), Number(previousLocation.longitude)]
            const end: [number, number] = [Number(location.latitude), Number(location.longitude)]

            // Calculate angle
            const dy = end[0] - start[0]
            const dx = end[1] - start[1]
            let theta = Math.atan2(dy, dx)
            theta *= 180 / Math.PI // rads to degs

            segments.push({ start, end, angle: -theta + 90 }) // Adjust for icon rotation
          }
          previousLocation = location
        }
      })
    })

    return segments
  }, [currentTrip, dayLocations])

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
      {routeSegments.map((segment, index) => (
        <React.Fragment key={`segment-${index}`}>
          <Polyline
            positions={[segment.start, segment.end]}
            pathOptions={{ color: "blue", weight: 3, opacity: 0.6, dashArray: "10, 10" }}
          />
          <Marker
            position={[(segment.start[0] + segment.end[0]) / 2, (segment.start[1] + segment.end[1]) / 2]}
            icon={L.divIcon({
              className: "arrow-icon",
              html: `<div style="transform: rotate(${segment.angle}deg); font-size: 20px; color: blue;">➤</div>`,
              iconSize: [20, 20],
              iconAnchor: [10, 10],
            })}
          />
        </React.Fragment>
      ))}
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
