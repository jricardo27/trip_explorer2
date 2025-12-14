import { useEffect, useState, useRef } from "react"
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline, LayersControl, GeoJSON } from "react-leaflet"
import "leaflet/dist/leaflet.css"
import { Box, Paper, Typography, IconButton, Select, MenuItem } from "@mui/material"
import { PlayArrow, Pause, Stop } from "@mui/icons-material"
import L from "leaflet"
import iconValidation from "../utils/iconValidation"
import type { Activity, TripAnimation } from "../types"
import { MARKER_MANIFEST } from "../data/markerManifest"

// Fix for default markers
iconValidation()

import { useMapEvents } from "react-leaflet"

import { createRoot } from "react-dom/client"
import PopupContent from "./PopupContent"
import { renderToStaticMarkup } from "react-dom/server"
import { MdHotel, MdKayaking, MdLocalGasStation, MdWc, MdPark, MdPlace } from "react-icons/md"
import { BsFuelPump } from "react-icons/bs"

// ... imports ...

interface TripMapProps {
  activities?: Activity[]
  selectedActivityId?: string
  animations?: TripAnimation[]
  onMapContextMenu?: (latLng: { lat: number; lng: number }) => void
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onMarkerContextMenu?: (feature: any) => void
  activeFlyToLocation?: { lat: number; lng: number } | null
}

const MapFlyHandler = ({ location }: { location?: { lat: number; lng: number } | null }) => {
  const map = useMap()
  useEffect(() => {
    if (location) {
      map.flyTo([location.lat, location.lng], 14, {
        duration: 1.5
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
// eslint-disable-next-line @typescript-eslint/no-explicit-any
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
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const GeoJSONLayer = ({ url, onContextMenu }: { url: string; onContextMenu?: (feature: any) => void }) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      pointToLayer={(feature: any, latlng) => {
        return L.marker(latlng, { icon: getIconForFeature(feature, layerStyle) })
      }}
      onEachFeature={(feature, layer) => {
        layer.on("contextmenu", () => {
          onContextMenu?.(feature)
        })

        // Bind Popup using React Component
        layer.bindPopup(() => {
          const div = document.createElement("div")
          const root = createRoot(div)
          const props = feature.properties
          const title = props.name || props.Name || "Unknown"

          // Basic image extraction if available in properties
          const images = props.images || []

          root.render(
            <PopupContent
              title={title}
              properties={props}
              images={images}
            />
          )
          return div
        }, { minWidth: 320 })
      }}
    />
  )
}

// Animation Controller Component
const AnimationController = ({
  animation,
  isPlaying,
  onPlayPause,
  onStop,
  currentStepIndex,
}: {
  animation: TripAnimation
  isPlaying: boolean
  onPlayPause: () => void
  onStop: () => void
  currentStepIndex: number
}) => {
  return (
    <Paper
      sx={{
        position: "absolute",
        bottom: 20,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 1000,
        p: 1,
        display: "flex",
        alignItems: "center",
        gap: 1,
      }}
    >
      <Typography variant="body2" sx={{ mr: 1 }}>
        {animation.name} - Step {currentStepIndex + 1}/{animation.steps.length}
      </Typography>
      <IconButton size="small" onClick={onPlayPause}>
        {isPlaying ? <Pause /> : <PlayArrow />}
      </IconButton>
      <IconButton size="small" onClick={onStop}>
        <Stop />
      </IconButton>
    </Paper>
  )
}

export default function TripMap({
  activities,
  selectedActivityId,
  animations,
  onMapContextMenu,
  onMarkerContextMenu,
  ...props
}: TripMapProps) {
  const defaultCenter: [number, number] = [-25.2744, 133.7751]
  const [center, setCenter] = useState<[number, number]>(defaultCenter)
  const [zoom, setZoom] = useState(4)

  const [activeAnimationId, setActiveAnimationId] = useState<string>("")
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [markerPosition, setMarkerPosition] = useState<[number, number] | null>(null)
  const [pathPositions, setPathPositions] = useState<[number, number][]>([])

  const animationRef = useRef<number | null>(null)
  const mapRef = useRef<L.Map | null>(null)

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
    <Paper elevation={3} sx={{ p: 1, height: 600, mb: 3, position: "relative" }}>
      {animations && animations.length > 0 && !isPlaying && (
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
          onStop={() => {
            setIsPlaying(false)
            setCurrentStepIndex(0)
            setPathPositions([])
          }}
          currentStepIndex={currentStepIndex}
        />
      )}

      <MapContainer center={center} zoom={zoom} style={{ height: "100%", width: "100%" }} ref={mapRef}>
        <LayersControl position="topright">
          <LayersControl.BaseLayer checked name="OpenStreetMap">
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
          </LayersControl.BaseLayer>

          {/* Markers from Manifest */}
          {Object.entries(MARKER_MANIFEST).map(([region, files]) =>
            // Type assertion to iterate safely if needed, but here simple map is fine
            files.map((file) => (
              <LayersControl.Overlay key={file} name={`${region} - ${file.replace(".json", "").replace("_", " ")}`}>
                <GeoJSONLayer url={`/markers/${region}/${file}`} onContextMenu={onMarkerContextMenu} />
              </LayersControl.Overlay>
            )),
          )}
        </LayersControl>

        <MapInteraction center={center} zoom={zoom} onContextMenu={onMapContextMenu} />
        <MapFlyHandler location={props.activeFlyToLocation} />

        {!isPlaying &&
          activities?.map((activity) => {
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
