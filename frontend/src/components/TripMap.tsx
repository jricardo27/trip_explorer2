import { PlayArrow, Pause, Stop } from "@mui/icons-material"
import { Box, Paper, Typography, IconButton, Select, MenuItem, Checkbox, ListItemText } from "@mui/material"
import L from "leaflet"
import { useEffect, useRef, useState } from "react"
import "leaflet/dist/leaflet.css"
import { createRoot } from "react-dom/client"
import { renderToStaticMarkup } from "react-dom/server"
import { BsFuelPump } from "react-icons/bs"
import { MdHotel, MdKayaking, MdLocalGasStation, MdWc, MdPark, MdPlace } from "react-icons/md"
import { GeoJSON, MapContainer, Marker, Polyline, Popup, TileLayer, useMap, useMapEvents } from "react-leaflet"

import { MARKER_MANIFEST } from "../data/markerManifest"
import type { Activity, TripAnimation } from "../types"

import PopupContent from "./PopupContent"

// ... imports ...

interface TripMapProps {
  activities?: Activity[]
  selectedActivityId?: string
  animations?: TripAnimation[]
  days?: Array<{ id: string; name?: string; dayIndex: number }>
  activeAnimationId?: string
  onMapContextMenu?: (latLng: { lat: number; lng: number }) => void

  onMarkerContextMenu?: (feature: any) => void
  activeFlyToLocation?: { lat: number; lng: number } | null
  hideAnimationControl?: boolean
}

const MapFlyHandler = ({ location }: { location?: { lat: number; lng: number } | null }) => {
  const map = useMap()
  useEffect(() => {
    if (location) {
      map.flyTo([location.lat, location.lng], 14, {
        duration: 1.5,
      })
    }
  }, [location, map])
  return null
}

const TransportIcon = new L.DivIcon({
  className: "custom-transport-icon",
  html: '<div style="font-size: 24px; text-align: center;">🚗</div>',
  iconSize: [30, 30],
  iconAnchor: [15, 15],
})

// Icon Mapping Helper

const getIconForFeature = (feature: any, layerStyle?: any) => {
  const iconKey = feature.properties?.style?.icon || layerStyle?.icon
  const color = feature.properties?.style?.color || layerStyle?.color || "blue"

  let IconComponent = MdPlace

  if (iconKey) {
    if (iconKey.includes("MdHotel")) IconComponent = MdHotel
    else if (iconKey.includes("MdKayaking")) IconComponent = MdKayaking
    else if (iconKey.includes("BsFuelPump") || iconKey.includes("Gas")) IconComponent = BsFuelPump
    else if (iconKey.includes("Wc") || iconKey.includes("Toilet")) IconComponent = MdWc
    else if (iconKey.includes("Park")) IconComponent = MdPark
    else if (iconKey.includes("Fuel")) IconComponent = MdLocalGasStation
  } else {
    // Fallback guessing
    const name = (feature.properties?.name || feature.properties?.Name || "").toLowerCase()
    const type = (feature.properties?.FacilityType || "").toLowerCase()

    if (type.includes("toilet") || name.includes("toilet")) IconComponent = MdWc
    else if (type.includes("park") || name.includes("park")) IconComponent = MdPark
    else if (name.includes("hotel") || name.includes("park") || name.includes("stay")) IconComponent = MdHotel
  }

  const iconHtml = renderToStaticMarkup(
    <div style={{ color: color, fontSize: "24px", filter: "drop-shadow(1px 1px 1px white)" }}>
      <IconComponent />
    </div>,
  )

  return new L.DivIcon({
    className: "custom-marker-icon",
    html: iconHtml,
    iconSize: [30, 30],
    iconAnchor: [15, 30],
    popupAnchor: [0, -30],
  })
}

// Component to handle map view updates and events
const MapInteraction = ({
  center,
  zoom,
  onContextMenu,
}: {
  center: [number, number]
  zoom: number
  onContextMenu?: (latLng: { lat: number; lng: number }) => void
}) => {
  const map = useMap()
  useEffect(() => {
    map.setView(center, zoom)
  }, [center, zoom, map])

  useMapEvents({
    contextmenu: (e) => {
      onContextMenu?.(e.latlng)
    },
  })
  return null
}

// GeoJSON Layer Component

const GeoJSONLayer = ({ url, onContextMenu }: { url: string; onContextMenu?: (feature: any) => void }) => {
  const [data, setData] = useState<any>(null)

  useEffect(() => {
    fetch(url)
      .then((res) => res.json())
      .then((data) => setData(data))
      .catch((err) => console.error("Failed to load GeoJSON:", err))
  }, [url])

  if (!data) return null

  const layerStyle = data.properties?.style

  return (
    <GeoJSON
      data={data}
      pointToLayer={(feature: any, latlng) => {
        return L.marker(latlng, { icon: getIconForFeature(feature, layerStyle) })
      }}
      onEachFeature={(feature, layer) => {
        layer.on("contextmenu", () => {
          onContextMenu?.(feature)
        })

        // Bind Popup using React Component
        layer.bindPopup(
          () => {
            const div = document.createElement("div")
            const root = createRoot(div)
            const props = feature.properties
            const title = props.name || props.Name || "Unknown"

            // Basic image extraction if available in properties
            const images = props.images || []

            root.render(<PopupContent title={title} properties={props} images={images} />)
            return div
          },
          { minWidth: 320 },
        )
      }}
    />
  )
}

// Animation Controller Component
const AnimationController = ({
  animation,
  isPlaying,
  onPlayPause,
  onReset,
  progress,
  onSeek,
}: {
  animation: TripAnimation
  isPlaying: boolean
  onPlayPause: () => void
  onReset: () => void
  progress: number
  onSeek: (value: number) => void
}) => {
  return (
    <Paper
      sx={{
        position: "absolute",
        bottom: 20,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 1000,
        p: 2,
        minWidth: 400,
        display: "flex",
        flexDirection: "column",
        gap: 1,
      }}
    >
      <Typography variant="body2" sx={{ fontWeight: "bold" }}>
        {animation.name}
      </Typography>
      <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
        <IconButton size="small" onClick={onPlayPause} color="primary">
          {isPlaying ? <Pause /> : <PlayArrow />}
        </IconButton>
        <IconButton size="small" onClick={onReset}>
          <Stop />
        </IconButton>
        <Box sx={{ flexGrow: 1, mx: 2 }}>
          <input
            type="range"
            min="0"
            max="100"
            value={progress}
            onChange={(e) => onSeek(Number(e.target.value))}
            style={{ width: "100%" }}
          />
        </Box>
        <Typography variant="caption">{Math.round(progress)}%</Typography>
      </Box>
    </Paper>
  )
}

export const TripMap = (props: TripMapProps) => {
  const {
    activities,
    selectedActivityId,
    animations,
    days,
    activeAnimationId: propActiveAnimationId,
    onMapContextMenu,
    onMarkerContextMenu,
    hideAnimationControl = false,
  } = props
  const defaultCenter: [number, number] = [-25.2744, 133.7751]
  const [center, setCenter] = useState<[number, number]>(defaultCenter)
  const [zoom, setZoom] = useState(4)

  const [activeAnimationId, setActiveAnimationId] = useState<string>("")
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [markerPosition, setMarkerPosition] = useState<[number, number] | null>(null)
  const [pathPositions, setPathPositions] = useState<[number, number][]>([])
  const [selectedMarkerLayers, setSelectedMarkerLayers] = useState<string[]>([])
  const [selectedDays, setSelectedDays] = useState<string[]>([])
  const [showFilters, setShowFilters] = useState(true)

  // Sync activeAnimationId from prop
  useEffect(() => {
    if (propActiveAnimationId) {
      setTimeout(() => {
        setActiveAnimationId(propActiveAnimationId)
        setIsPlaying(true)
      }, 0)
    }
  }, [propActiveAnimationId])

  const animationRef = useRef<number | null>(null)
  const mapRef = useRef<L.Map | null>(null)

  // Get unique days from activities with their names
  const uniqueDays = Array.from(
    new Map(
      activities
        ?.filter((a) => a.tripDayId)
        .map((a) => {
          const dayInfo = days?.find((d) => d.id === a.tripDayId)
          return {
            id: a.tripDayId!,
            name: dayInfo?.name || `Day ${(dayInfo?.dayIndex ?? 0) + 1}`,
          }
        })
        .map((day) => [day.id, day]),
    ).values(),
  )

  // Filter activities based on selected days
  const filteredActivities =
    selectedDays.length > 0 ? activities?.filter((a) => a.tripDayId && selectedDays.includes(a.tripDayId)) : activities

  const activeAnimation = animations?.find((a) => a.id === activeAnimationId)

  // Calculate bounds when activities change (only if not animating)
  useEffect(() => {
    if (!isPlaying && activities && activities.length > 0) {
      const validActivities = activities.filter((a) => a.latitude && a.longitude)
      if (validActivities.length > 0) {
        // Focus on selected activity if available, else first
        const targetActivity = selectedActivityId
          ? validActivities.find((a) => a.id === selectedActivityId)
          : validActivities[0]

        const finalActivity = targetActivity || validActivities[0]

        if (finalActivity.latitude && finalActivity.longitude) {
          // Wrap in timeout to avoid "setState synchronously in effect" warning
          const timer = setTimeout(() => {
            setCenter([finalActivity.latitude!, finalActivity.longitude!])
            setZoom(10)
          }, 0)
          return () => clearTimeout(timer)
        }
      }
    }
  }, [activities, isPlaying, selectedActivityId])

  // Animation Tick
  useEffect(() => {
    if (isPlaying && activeAnimation) {
      const step = activeAnimation.steps[currentStepIndex]
      if (!step) {
        setTimeout(() => setIsPlaying(false), 0)
        return
      }

      const activity = activities?.find((a) => a.id === step.activityId)

      if (activity?.latitude && activity?.longitude) {
        // Wrap in timeout to avoid synchronous update warning
        const updateTimer = setTimeout(() => {
          setCenter([activity.latitude!, activity.longitude!])
          setMarkerPosition([activity.latitude!, activity.longitude!])
          setPathPositions((prev) => [...prev, [activity.latitude!, activity.longitude!]])
          setZoom(step.zoomLevel || 15) // Zoom in on activity
        }, 0)

        // For this demo, we simply jump to next step after timeout
        animationRef.current = window.setTimeout(() => {
          if (currentStepIndex < activeAnimation.steps.length - 1) {
            setZoom(5)
            setCurrentStepIndex((prev) => prev + 1)
          } else {
            setIsPlaying(false)
            setCurrentStepIndex(0)
            setPathPositions([])
          }
        }, 2000)
        return () => {
          clearTimeout(updateTimer)
          if (animationRef.current) {
            clearTimeout(animationRef.current)
          }
        }
      } else {
        setTimeout(() => setCurrentStepIndex((prev) => prev + 1), 0)
      }
    }
  }, [isPlaying, currentStepIndex, activeAnimation, activities])

  return (
    <Paper elevation={3} sx={{ p: 1, height: "100%", mb: 0, position: "relative" }}>
      {animations && animations.length > 0 && !isPlaying && !hideAnimationControl && (
        <Box
          sx={{
            position: "absolute",
            top: 10,
            left: 60,
            zIndex: 1000,
            bgcolor: "white",
            p: 1,
            borderRadius: 1,
            display: "flex",
            gap: 1,
          }}
        >
          <Select
            value={activeAnimationId}
            onChange={(e) => setActiveAnimationId(e.target.value)}
            displayEmpty
            size="small"
            sx={{ minWidth: 150 }}
          >
            <MenuItem value="">Select Animation...</MenuItem>
            {animations.map((a) => (
              <MenuItem key={a.id} value={a.id}>
                {a.name}
              </MenuItem>
            ))}
          </Select>
          <IconButton
            disabled={!activeAnimationId}
            onClick={() => {
              setCurrentStepIndex(0)
              setIsPlaying(true)
            }}
            color="primary"
          >
            <PlayArrow />
          </IconButton>
        </Box>
      )}

      {isPlaying && activeAnimation && (
        <AnimationController
          animation={activeAnimation}
          isPlaying={isPlaying}
          onPlayPause={() => setIsPlaying(!isPlaying)}
          onReset={() => {
            setIsPlaying(false)
            setCurrentStepIndex(0)
            setPathPositions([])
          }}
          progress={
            activeAnimation.steps.length > 1
              ? (currentStepIndex / (activeAnimation.steps.length - 1)) * 100
              : currentStepIndex === 0 && activeAnimation.steps.length === 1
                ? 100
                : 0
          }
          onSeek={(value) => {
            const maxIndex = activeAnimation.steps.length > 0 ? activeAnimation.steps.length - 1 : 0
            const newIndex = Math.round((value / 100) * maxIndex)
            setCurrentStepIndex(newIndex)
          }}
        />
      )}

      <MapContainer center={center} zoom={zoom} style={{ height: "100%", width: "100%" }} ref={mapRef}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Markers from Manifest - Smart filtering based on trip location */}
        {(() => {
          // Detect relevant regions based on activity locations
          const relevantRegions = new Set<string>()

          // Simple state detection based on activity coordinates
          // This is a basic implementation - could be enhanced with reverse geocoding
          activities?.forEach((activity) => {
            if (activity.latitude && activity.longitude) {
              const lat = activity.latitude
              const lng = activity.longitude

              // Rough bounding boxes for Australian states
              if (lng >= 115 && lng <= 129 && lat >= -35 && lat <= -14) relevantRegions.add("westernAustralia")
              if (lng >= 129 && lng <= 138 && lat >= -26 && lat <= -11) relevantRegions.add("northernTerritory")
              if (lng >= 138 && lng <= 141 && lat >= -38 && lat <= -26) relevantRegions.add("southAustralia")
              if (lng >= 141 && lng <= 154 && lat >= -39 && lat <= -28) relevantRegions.add("victoria")
              if (lng >= 141 && lng <= 154 && lat >= -29 && lat <= -10) relevantRegions.add("queensland")
              if (lng >= 141 && lng <= 154 && lat >= -38 && lat <= -28) relevantRegions.add("newSouthWales")
              if (lng >= 144 && lng <= 149 && lat >= -44 && lat <= -40) relevantRegions.add("tasmania")
              if (lng >= 148 && lng <= 150 && lat >= -36 && lat <= -35)
                relevantRegions.add("australianCapitalTerritory")
              if (lng >= 166 && lng <= 179 && lat >= -47 && lat <= -34) relevantRegions.add("newZealand")
            }
          })

          // If no activities or no coordinates, show all regions
          const regionsToShow = relevantRegions.size > 0 ? Array.from(relevantRegions) : Object.keys(MARKER_MANIFEST)

          return (
            <>
              {/* Filter Toggle and Content */}
              <Box
                sx={{
                  position: "absolute",
                  top: 10,
                  right: 10,
                  zIndex: 1000,
                  bgcolor: "white",
                  borderRadius: 1,
                  boxShadow: 2,
                  p: showFilters ? 1.5 : 1,
                  minWidth: showFilters ? 220 : "auto",
                  maxWidth: 300,
                }}
              >
                {!showFilters && (
                  <IconButton size="small" onClick={() => setShowFilters(true)} title="Show filters">
                    <Typography variant="caption">Filters</Typography>
                  </IconButton>
                )}
                {showFilters && (
                  <>
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
                      <Typography variant="caption" sx={{ fontWeight: "bold" }}>
                        Filters
                      </Typography>
                      <IconButton size="small" onClick={() => setShowFilters(false)} title="Hide filters">
                        <Typography variant="caption">✕</Typography>
                      </IconButton>
                    </Box>
                    <Select
                      size="small"
                      multiple
                      value={selectedDays}
                      onChange={(e) => setSelectedDays(e.target.value as string[])}
                      displayEmpty
                      sx={{ width: "100%", fontSize: "0.875rem", mb: 2 }}
                      renderValue={(selected) => {
                        if ((selected || []).length === 0) return "All days"
                        const selectedNames = uniqueDays
                          .filter((d) => (selected || []).includes(d.id))
                          .map((d) => d.name)
                        return selectedNames.join(", ")
                      }}
                    >
                      {uniqueDays.map((day) => (
                        <MenuItem key={day.id} value={day.id}>
                          <Checkbox checked={selectedDays.includes(day.id)} />
                          <ListItemText primary={day.name} />
                        </MenuItem>
                      ))}
                    </Select>

                    {/* Marker Layers */}
                    <Typography variant="caption" sx={{ fontWeight: "bold", display: "block", mb: 1 }}>
                      Map Layers
                    </Typography>
                    <Select
                      size="small"
                      multiple
                      value={selectedMarkerLayers}
                      onChange={(e) => setSelectedMarkerLayers(e.target.value as string[])}
                      displayEmpty
                      renderValue={(selected) =>
                        (selected || []).length === 0 ? "Select layers..." : `${(selected || []).length} layers`
                      }
                      sx={{ width: "100%", fontSize: "0.875rem" }}
                    >
                      {regionsToShow.map((region) => {
                        const files = MARKER_MANIFEST[region as keyof typeof MARKER_MANIFEST]
                        return files.map((file) => {
                          const layerKey = `${region}/${file}`
                          const displayName = `${region.replace(/([A-Z])/g, " $1").trim()} - ${file.replace(".json", "").replace(/_/g, " ")}`
                          return (
                            <MenuItem key={layerKey} value={layerKey}>
                              {displayName}
                            </MenuItem>
                          )
                        })
                      })}
                    </Select>
                    {relevantRegions.size > 0 && (
                      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
                        Showing {regionsToShow.length} relevant region(s)
                      </Typography>
                    )}
                  </>
                )}
              </Box>

              {/* Render selected marker layers */}
              {(selectedMarkerLayers || []).map((layerKey: string) => {
                const [region, file] = layerKey.split("/")
                return (
                  <GeoJSONLayer key={layerKey} url={`/markers/${region}/${file}`} onContextMenu={onMarkerContextMenu} />
                )
              })}
            </>
          )
        })()}

        <MapInteraction center={center} zoom={zoom} onContextMenu={onMapContextMenu} />
        <MapFlyHandler location={props.activeFlyToLocation} />

        {!isPlaying &&
          filteredActivities?.map((activity) => {
            if (activity.latitude && activity.longitude) {
              return (
                <Marker key={activity.id} position={[activity.latitude, activity.longitude]}>
                  <Popup>{activity.name}</Popup>
                </Marker>
              )
            }
            return null
          })}

        {/* Animated Marker */}
        {isPlaying && markerPosition && (
          <>
            <Marker position={markerPosition} icon={TransportIcon} />
            {pathPositions.length > 0 && <Polyline positions={pathPositions} color="blue" weight={4} opacity={0.6} />}
          </>
        )}
      </MapContainer>
    </Paper>
  )
}
