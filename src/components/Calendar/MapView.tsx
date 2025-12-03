import { Box, Typography, Slider, Paper } from "@mui/material"
import axios from "axios"
import L from "leaflet"
import icon from "leaflet/dist/images/marker-icon.png"
import iconShadow from "leaflet/dist/images/marker-shadow.png"
import React, { useState, useEffect, useCallback, useMemo } from "react"
import { Marker, Popup, Polyline, useMap } from "react-leaflet"

import MapComponent from "../MapComponent/MapComponent"

// Fix Leaflet marker icon issue

const DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
})

L.Marker.prototype.options.icon = DefaultIcon

interface Activity {
  id: string
  name: string
  scheduled_start: string | null
  scheduled_end: string | null
  activity_type: string
  latitude?: number
  longitude?: number
  description?: string
}

interface MapViewProps {
  tripId: string
}

// Component to fit bounds
const FitBounds = ({ activities }: { activities: Activity[] }) => {
  const map = useMap()

  useEffect(() => {
    if (activities.length === 0) return

    const bounds = L.latLngBounds(
      activities.filter((a) => a.latitude && a.longitude).map((a) => [a.latitude!, a.longitude!]),
    )

    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [50, 50] })
    }
  }, [activities, map])

  return null
}

const CalendarMapView: React.FC<MapViewProps> = ({ tripId }) => {
  const [activities, setActivities] = useState<Activity[]>([])
  const [timeRange, setTimeRange] = useState<number[]>([0, 24])

  const fetchActivities = useCallback(async () => {
    try {
      const response = await axios.get(`/api/trips/${tripId}/activities`)
      setActivities(response.data)
    } catch (err) {
      console.error("Error fetching activities:", err)
    }
  }, [tripId])

  useEffect(() => {
    fetchActivities()
  }, [fetchActivities])

  const validActivities = useMemo(
    () => activities.filter((a) => a.latitude && a.longitude && a.scheduled_start),
    [activities],
  )

  const filteredActivities = useMemo(() => {
    return validActivities.filter((activity) => {
      if (!activity.scheduled_start) return false
      const hour = new Date(activity.scheduled_start).getHours()
      return hour >= timeRange[0] && hour <= timeRange[1]
    })
  }, [validActivities, timeRange])

  const getActivityColor = (type: string) => {
    const colors: Record<string, string> = {
      accommodation: "#4CAF50",
      transport: "#2196F3",
      dining: "#FF9800",
      activity: "#9C27B0",
      sightseeing: "#F44336",
    }
    return colors[type] || "#757575"
  }

  // Create custom icons based on type
  const getIcon = (type: string) => {
    const color = getActivityColor(type)
    return L.divIcon({
      className: "custom-marker",
      html: `<div style="background-color: ${color}; width: 12px; height: 12px; border-radius: 50%; 
             border: 2px solid white; box-shadow: 0 0 4px rgba(0,0,0,0.3);"></div>`,
      iconSize: [16, 16],
      iconAnchor: [8, 8],
    })
  }

  // Sort by time for routing
  const sortedActivities = useMemo(() => {
    return [...filteredActivities].sort((a, b) => {
      return new Date(a.scheduled_start!).getTime() - new Date(b.scheduled_start!).getTime()
    })
  }, [filteredActivities])

  const routePositions = useMemo(() => {
    return sortedActivities.map((a) => [a.latitude!, a.longitude!] as [number, number])
  }, [sortedActivities])

  const handleTimeChange = (_event: Event, newValue: number | number[]) => {
    setTimeRange(newValue as number[])
  }

  const formatTimeLabel = (value: number) => {
    return `${value}:00`
  }

  if (activities.length === 0) {
    return (
      <Box sx={{ p: 3, textAlign: "center" }}>
        <Typography color="text.secondary">No activities found for this trip.</Typography>
      </Box>
    )
  }

  // Calculate center
  const center: [number, number] =
    validActivities.length > 0 ? [validActivities[0].latitude!, validActivities[0].longitude!] : [0, 0]

  return (
    <Box sx={{ height: "calc(100vh - 200px)", position: "relative", display: "flex", flexDirection: "column" }}>
      <Box sx={{ flexGrow: 1, position: "relative" }}>
        <MapComponent center={center}>
          <FitBounds activities={validActivities} />

          {/* Route line */}
          {routePositions.length > 1 && (
            <Polyline
              positions={routePositions}
              pathOptions={{ color: "#666", weight: 2, dashArray: "5, 10", opacity: 0.6 }}
            />
          )}

          {/* Activity Markers */}
          {filteredActivities.map((activity) => (
            <Marker
              key={activity.id}
              position={[activity.latitude!, activity.longitude!]}
              icon={getIcon(activity.activity_type)}
            >
              <Popup>
                <Box>
                  <Typography variant="subtitle2">{activity.name}</Typography>
                  <Typography variant="caption" display="block">
                    {new Date(activity.scheduled_start!).toLocaleString([], {
                      weekday: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {activity.activity_type}
                  </Typography>
                </Box>
              </Popup>
            </Marker>
          ))}
        </MapComponent>

        {/* Time Slider Control */}
        <Paper
          sx={{
            position: "absolute",
            bottom: 20,
            left: "50%",
            transform: "translateX(-50%)",
            width: "80%",
            maxWidth: 600,
            p: 2,
            zIndex: 1000,
            bgcolor: "rgba(255, 255, 255, 0.9)",
            backdropFilter: "blur(4px)",
          }}
          elevation={3}
        >
          <Typography variant="caption" gutterBottom>
            Filter by Time of Day: {timeRange[0]}:00 - {timeRange[1]}:00
          </Typography>
          <Slider
            value={timeRange}
            onChange={handleTimeChange}
            valueLabelDisplay="auto"
            valueLabelFormat={formatTimeLabel}
            min={0}
            max={24}
            step={1}
            marks={[
              { value: 0, label: "0h" },
              { value: 6, label: "6h" },
              { value: 12, label: "12h" },
              { value: 18, label: "18h" },
              { value: 24, label: "24h" },
            ]}
          />
        </Paper>
      </Box>
    </Box>
  )
}

export default CalendarMapView
