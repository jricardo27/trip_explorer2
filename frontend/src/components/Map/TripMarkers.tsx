import L from "leaflet"
import React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import {
  MdHotel,
  MdRestaurant,
  MdCameraAlt,
  MdDirectionsBus,
  MdFlight,
  MdDirectionsRun,
  MdTour,
  MdEvent,
  MdPlace,
  MdHelp,
} from "react-icons/md"
import { Marker, Tooltip as LeafletTooltip } from "react-leaflet"

import type { Activity } from "../../types"

interface TripMarkersProps {
  activities: Activity[]
  onActivityClick?: (activity: Activity) => void
}

const ACTIVITY_TYPE_ICONS: Record<string, { icon: React.ElementType; color: string }> = {
  ACCOMMODATION: { icon: MdHotel, color: "#E91E63" },
  RESTAURANT: { icon: MdRestaurant, color: "#FF9800" },
  ATTRACTION: { icon: MdCameraAlt, color: "#9C27B0" },
  TRANSPORT: { icon: MdDirectionsBus, color: "#2196F3" },
  FLIGHT: { icon: MdFlight, color: "#03A9F4" },
  ACTIVITY: { icon: MdDirectionsRun, color: "#4CAF50" },
  TOUR: { icon: MdTour, color: "#8BC34A" },
  EVENT: { icon: MdEvent, color: "#FFC107" },
  LOCATION: { icon: MdPlace, color: "#795548" },
  CUSTOM: { icon: MdHelp, color: "#607D8B" },
}

const getActivityVisuals = (activity: Activity) => {
  const type = activity.activityType || "CUSTOM"
  return ACTIVITY_TYPE_ICONS[type] || ACTIVITY_TYPE_ICONS.CUSTOM
}

// Helper to get coordinates from an activity
const getCoords = (activity: Activity): [number, number] | null => {
  if (activity.latitude && activity.longitude) {
    return [Number(activity.latitude), Number(activity.longitude)]
  }
  return null
}

export const TripMarkers: React.FC<TripMarkersProps> = ({ activities, onActivityClick }) => {
  const validActivities = activities.filter((a) => a.latitude && a.longitude)

  return (
    <>
      {validActivities.map((activity) => {
        const position = getCoords(activity)
        if (!position) return null

        const { icon: IconComp, color } = getActivityVisuals(activity)
        const markerIcon = L.divIcon({
          html: renderToStaticMarkup(
            <div
              style={{
                color: color,
                fontSize: "20px",
                background: "white",
                borderRadius: "50%",
                padding: "6px",
                boxShadow: "0 2px 4px rgba(0,0,0,0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: `2px solid ${color}`,
              }}
            >
              <IconComp />
            </div>,
          ),
          className: "location-icon",
          iconSize: [36, 36],
          iconAnchor: [18, 18],
        })

        return (
          <Marker
            key={activity.id}
            position={position}
            icon={markerIcon}
            eventHandlers={{
              click: () => onActivityClick?.(activity),
            }}
          >
            <LeafletTooltip direction="top" offset={[0, -18]}>
              <strong>{activity.name}</strong>
            </LeafletTooltip>
            {/* Keeping Popup as well for quick info, though click opens details */}
            {/* <Popup>
              <strong>{activity.name}</strong>
              {activity.description && (
                <div>
                  <br />
                  {activity.description.substring(0, 100)}
                  {activity.description.length > 100 && "..."}
                </div>
              )}
            </Popup> */}
          </Marker>
        )
      })}
    </>
  )
}
