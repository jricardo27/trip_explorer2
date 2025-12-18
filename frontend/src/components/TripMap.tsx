import { PlayArrow, Pause, Stop, Layers as LayersIcon } from "@mui/icons-material"
import { Box, Paper, Typography, IconButton, Select, MenuItem, Checkbox, ListItemText, useTheme } from "@mui/material"
import L from "leaflet"
import { useEffect, useRef, useState, useCallback, useMemo } from "react"
import { createRoot } from "react-dom/client"
import { renderToStaticMarkup } from "react-dom/server"
import { BsFuelPump } from "react-icons/bs"
import { MdHotel, MdKayaking, MdLocalGasStation, MdWc, MdPark, MdPlace } from "react-icons/md"
import {
  GeoJSON,
  MapContainer,
  Marker,
  Polyline,
  Popup,
  TileLayer,
  useMap,
  useMapEvents,
  LayersControl,
} from "react-leaflet"
import "leaflet/dist/leaflet.css"

import { MARKER_MANIFEST } from "../data/markerManifest"
import type { Activity, TripAnimation } from "../types"
import { getGreatCirclePath, getGreatCirclePoint } from "../utils/geodesicUtils"
import { fetchRoute, interpolateAlongPath } from "../utils/routingUtils"

import { BaseLayers } from "./Map/BaseLayers"
import PopupContent from "./PopupContent"

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

const LIGHT_TILES = {
  url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
}

const DARK_TILES = {
  url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
}

// --- Helper Components ---

const MapFlyHandler = ({ location }: { location?: { lat: number; lng: number } | null }) => {
  const map = useMap()
  useEffect(() => {
    if (location) {
      map.flyTo([location.lat, location.lng], 14, { duration: 1.5 })
    }
  }, [location, map])
  return null
}

const MapStateManager = ({
  onMapMove,
  onContextMenu,
}: {
  onMapMove: (center: [number, number], zoom: number) => void
  onContextMenu?: (latLng: { lat: number; lng: number }) => void
}) => {
  const map = useMap()
  useMapEvents({
    moveend: () => {
      const center = map.getCenter()
      onMapMove([center.lat, center.lng], map.getZoom())
    },
    zoomend: () => {
      const center = map.getCenter()
      onMapMove([center.lat, center.lng], map.getZoom())
    },
    contextmenu: (e) => {
      onContextMenu?.(e.latlng)
    },
  })
  return null
}

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
    const name = (feature.properties?.name || feature.properties?.Name || "").toLowerCase()
    const type = (feature.properties?.FacilityType || "").toLowerCase()
    if (type.includes("toilet") || name.includes("toilet")) IconComponent = MdWc
    else if (type.includes("park") || name.includes("park")) IconComponent = MdPark
    else if (name.includes("hotel") || name.includes("stay")) IconComponent = MdHotel
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
      pointToLayer={(feature, latlng) => L.marker(latlng, { icon: getIconForFeature(feature, layerStyle) })}
      onEachFeature={(feature, layer) => {
        layer.on("contextmenu", () => onContextMenu?.(feature))
        layer.bindPopup(
          () => {
            const div = document.createElement("div")
            const root = createRoot(div)
            const props = feature.properties
            root.render(
              <PopupContent
                title={props.name || props.Name || "Unknown"}
                properties={props}
                images={props.images || []}
              />,
            )
            return div
          },
          { minWidth: 320 },
        )
      }}
    />
  )
}

// --- Animation Components ---

interface AdvancedAnimationLayerProps {
  steps: any[]
  isPlaying: boolean
  onProgressUpdate: (progress: number) => void
  onAnimationComplete: () => void
  seekProgress: number | null
}

const AdvancedAnimationLayer = ({
  steps,
  isPlaying,
  onProgressUpdate,
  onAnimationComplete,
  seekProgress,
}: AdvancedAnimationLayerProps) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [stepProgress, setStepProgress] = useState(0)
  const [cachedRoutes, setCachedRoutes] = useState<Record<string, [number, number][]>>({})
  const requestRef = useRef<number | null>(null)
  const previousTimeRef = useRef<number | undefined>(undefined)

  const validSteps = useMemo(() => steps.filter((s) => s.activity?.latitude && s.activity?.longitude), [steps])
  const coords = useMemo(
    () => validSteps.map((s) => [s.activity.latitude, s.activity.longitude] as [number, number]),
    [validSteps],
  )

  useEffect(() => {
    const loadRoutes = async () => {
      const newRoutes: Record<string, [number, number][]> = {}
      let hasUpdates = false
      for (let i = 0; i < coords.length - 1; i++) {
        const key = `${i}-${coords[i].join(",")}-${coords[i + 1].join(",")}`
        if (cachedRoutes[key]) continue
        const mode = validSteps[i + 1].transportMode
        if (mode && mode !== "FLIGHT") {
          const route = await fetchRoute(coords[i], coords[i + 1], mode)
          if (route) {
            newRoutes[key] = route
            hasUpdates = true
          }
        }
      }
      if (hasUpdates) setCachedRoutes((prev) => ({ ...prev, ...newRoutes }))
    }
    loadRoutes()
  }, [coords, validSteps, cachedRoutes])

  // Use a ref for the animate function to avoid hoisting issues and redundant dependency changes
  const animateRef = useRef<(time: number) => void>(() => {})

  useEffect(() => {
    animateRef.current = (time: number) => {
      if (previousTimeRef.current !== undefined) {
        const deltaTime = time - previousTimeRef.current
        if (isPlaying && currentStepIndex < coords.length - 1) {
          const speed = 0.0005
          const newProgress = stepProgress + speed * deltaTime
          if (newProgress >= 1) {
            if (currentStepIndex < coords.length - 2) {
              setCurrentStepIndex((prev) => prev + 1)
              setStepProgress(0)
            } else {
              setStepProgress(1)
              onAnimationComplete()
            }
          } else {
            setStepProgress(newProgress)
          }
        }
      }
      previousTimeRef.current = time
      const totalProgress = coords.length > 1 ? ((currentStepIndex + stepProgress) / (coords.length - 1)) * 100 : 100
      onProgressUpdate(totalProgress)
      requestRef.current = requestAnimationFrame(animateRef.current)
    }
  }, [isPlaying, currentStepIndex, stepProgress, coords, onAnimationComplete, onProgressUpdate])

  useEffect(() => {
    if (isPlaying) {
      requestRef.current = requestAnimationFrame(animateRef.current)
    } else if (requestRef.current) {
      cancelAnimationFrame(requestRef.current)
    }
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current)
    }
  }, [isPlaying])

  useEffect(() => {
    if (seekProgress !== null) {
      const totalSteps = coords.length - 1
      if (totalSteps <= 0) return
      const globalProgress = seekProgress / 100
      const targetStep = Math.min(Math.floor(globalProgress * totalSteps), totalSteps - 1)
      const targetStepProgress = (globalProgress * totalSteps) % 1
      setTimeout(() => {
        setCurrentStepIndex(targetStep)
        setStepProgress(targetStepProgress)
      }, 0)
    }
  }, [seekProgress, coords.length])

  const currentPosition = useMemo(() => {
    if (coords.length < 2) return null
    if (currentStepIndex >= coords.length - 1) return coords[coords.length - 1]
    const p1 = coords[currentStepIndex]
    const p2 = coords[currentStepIndex + 1]
    const key = `${currentStepIndex}-${p1.join(",")}-${p2.join(",")}`
    const route = cachedRoutes[key]
    if (route) return interpolateAlongPath(route, stepProgress)
    return getGreatCirclePoint(p1, p2, stepProgress)
  }, [coords, currentStepIndex, stepProgress, cachedRoutes])

  const pathPositions = useMemo(() => {
    if (coords.length < 2) return []
    const fullPath: [number, number][] = []
    for (let i = 0; i <= currentStepIndex; i++) {
      if (i === coords.length - 1) break
      const p1 = coords[i]
      const p2 = coords[i + 1]
      const key = `${i}-${p1.join(",")}-${p2.join(",")}`
      const route = cachedRoutes[key]
      if (route) {
        if (i < currentStepIndex) fullPath.push(...route)
        else fullPath.push(...route.slice(0, Math.floor(route.length * stepProgress)))
      } else {
        const gcPath = getGreatCirclePath(p1, p2, 20)
        if (i < currentStepIndex) fullPath.push(...gcPath)
        else fullPath.push(...gcPath.slice(0, Math.floor(gcPath.length * stepProgress)))
      }
    }
    if (currentPosition) fullPath.push(currentPosition)
    return fullPath
  }, [coords, currentStepIndex, stepProgress, cachedRoutes, currentPosition])

  const TransportIcon = useMemo(
    () =>
      new L.DivIcon({
        className: "custom-transport-icon",
        html: `
          <div style="font-size: 24px; text-align: center; background: white; border-radius: 50%; padding: 4px; box-shadow: 0 2px 5px rgba(0,0,0,0.3);">
            🚗
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      }),
    [],
  )

  return (
    <>
      <Polyline positions={pathPositions} color="#1976d2" weight={4} opacity={0.8} />
      {currentPosition && <Marker position={currentPosition} icon={TransportIcon} zIndexOffset={2000} />}
    </>
  )
}

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
}) => (
  <Paper
    elevation={4}
    sx={{
      position: "absolute",
      bottom: 20,
      left: "50%",
      transform: "translateX(-50%)",
      zIndex: 1000,
      p: 2,
      minWidth: 400,
      borderRadius: 2,
      display: "flex",
      flexDirection: "column",
      gap: 1,
    }}
  >
    <Box display="flex" justifyContent="space-between" alignItems="center">
      <Typography variant="subtitle2" sx={{ fontWeight: "bold" }}>
        {animation.name}
      </Typography>
      <Typography variant="caption" color="text.secondary">
        {Math.round(progress)}%
      </Typography>
    </Box>
    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
      <IconButton
        size="small"
        onClick={onPlayPause}
        color="primary"
        sx={{ bgcolor: "primary.light", color: "white", "&:hover": { bgcolor: "primary.main" } }}
      >
        {isPlaying ? <Pause /> : <PlayArrow />}
      </IconButton>
      <IconButton size="small" onClick={onReset} sx={{ bgcolor: "grey.200" }}>
        <Stop />
      </IconButton>
      <Box sx={{ flexGrow: 1, mx: 1, display: "flex", alignItems: "center" }}>
        <input
          type="range"
          min="0"
          max="100"
          value={progress}
          onChange={(e) => onSeek(Number(e.target.value))}
          style={{ width: "100%", accentColor: "#1976d2", cursor: "pointer" }}
        />
      </Box>
    </Box>
  </Paper>
)

// --- Main Component ---

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
  const theme = useTheme()
  const tiles = theme.palette.mode === "light" ? LIGHT_TILES : DARK_TILES

  const [mapState, setMapState] = useState(() => {
    const saved = localStorage.getItem("mapState")
    return saved ? JSON.parse(saved) : { center: [-25.2744, 133.7751] as [number, number], zoom: 4 }
  })

  const [activeBaseLayer, setActiveBaseLayer] = useState(
    () => localStorage.getItem("activeBaseLayer") ?? "Esri World Street Map",
  )
  const [activeAnimationId, setActiveAnimationId] = useState("")
  const [isPlaying, setIsPlaying] = useState(false)
  const [animationProgress, setAnimationProgress] = useState(0)
  const [seekProgress, setSeekProgress] = useState<number | null>(null)
  const [selectedMarkerLayers, setSelectedMarkerLayers] = useState<string[]>([])
  const [selectedDays, setSelectedDays] = useState<string[]>([])
  const [showFilters, setShowFilters] = useState(true)

  const handleMapMove = useCallback((center: [number, number], zoom: number) => {
    setMapState({ center, zoom })
    localStorage.setItem("mapState", JSON.stringify({ center, zoom }))
  }, [])

  useEffect(() => {
    localStorage.setItem("activeBaseLayer", activeBaseLayer)
  }, [activeBaseLayer])
  useEffect(() => {
    if (propActiveAnimationId) {
      setTimeout(() => {
        setActiveAnimationId(propActiveAnimationId)
        setIsPlaying(true)
      }, 0)
    }
  }, [propActiveAnimationId])

  const activeAnimation = useMemo(
    () => animations?.find((a) => a.id === activeAnimationId),
    [animations, activeAnimationId],
  )
  const uniqueDays = useMemo(
    () =>
      Array.from(
        new Map(
          activities
            ?.filter((a) => a.tripDayId)
            .map((a) => {
              const dayInfo = days?.find((d) => d.id === a.tripDayId)
              return { id: a.tripDayId!, name: dayInfo?.name || `Day ${(dayInfo?.dayIndex ?? 0) + 1}` }
            })
            .map((day) => [day.id, day]),
        ).values(),
      ),
    [activities, days],
  )

  const filteredActivities = useMemo(
    () =>
      selectedDays.length > 0
        ? activities?.filter((a) => a.tripDayId && selectedDays.includes(a.tripDayId))
        : activities,
    [activities, selectedDays],
  )

  useEffect(() => {
    if (!isPlaying && selectedActivityId) {
      const activity = activities?.find((a) => a.id === selectedActivityId)
      if (activity?.latitude && activity?.longitude) {
        setTimeout(() => setMapState({ center: [activity.latitude!, activity.longitude!], zoom: 14 }), 0)
      }
    }
  }, [selectedActivityId, activities, isPlaying])

  return (
    <Paper elevation={3} sx={{ p: 1, height: "100%", mb: 0, position: "relative", overflow: "hidden" }}>
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
            boxShadow: 2,
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
              setSeekProgress(0)
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
            setSeekProgress(0)
          }}
          progress={animationProgress}
          onSeek={setSeekProgress}
        />
      )}

      <MapContainer
        center={mapState.center}
        zoom={mapState.zoom}
        style={{ height: "100%", width: "100%" }}
        scrollWheelZoom={true}
      >
        <MapStateManager onMapMove={handleMapMove} onContextMenu={onMapContextMenu} />
        <MapFlyHandler location={props.activeFlyToLocation} />
        <TileLayer attribution={tiles.attribution} url={tiles.url} maxZoom={20} />
        <LayersControl position="topright">
          {Object.entries(BaseLayers).map(([key, layer]) => (
            <LayersControl.BaseLayer key={key} name={layer.name} checked={activeBaseLayer === layer.name}>
              <TileLayer
                attribution={layer.attribution}
                url={layer.url}
                maxZoom={layer.maxZoom || 20}
                eventHandlers={{ add: () => setActiveBaseLayer(layer.name) }}
              />
            </LayersControl.BaseLayer>
          ))}
        </LayersControl>

        {(() => {
          const relevantRegions = new Set<string>()
          activities?.forEach((a) => {
            if (a.latitude && a.longitude) {
              const { latitude: lat, longitude: lng } = a
              if (lng >= 115 && lng <= 129 && lat >= -35 && lat <= -14) relevantRegions.add("westernAustralia")
              else if (lng >= 129 && lng <= 138 && lat >= -26 && lat <= -11) relevantRegions.add("northernTerritory")
              else if (lng >= 138 && lng <= 141 && lat >= -38 && lat <= -26) relevantRegions.add("southAustralia")
              else if (lng >= 141 && lng <= 154 && lat >= -39 && lat <= -28) relevantRegions.add("victoria")
              else if (lng >= 141 && lng <= 154 && lat >= -29 && lat <= -10) relevantRegions.add("queensland")
              else if (lng >= 141 && lng <= 154 && lat >= -38 && lat <= -28) relevantRegions.add("newSouthWales")
              else if (lng >= 144 && lng <= 149 && lat >= -44 && lat <= -40) relevantRegions.add("tasmania")
              else if (lng >= 148 && lng <= 150 && lat >= -36 && lat <= -35)
                relevantRegions.add("australianCapitalTerritory")
              else if (lng >= 166 && lng <= 179 && lat >= -47 && lat <= -34) relevantRegions.add("newZealand")
            }
          })
          const regionsToShow = relevantRegions.size > 0 ? Array.from(relevantRegions) : Object.keys(MARKER_MANIFEST)
          return (
            <>
              <Box
                sx={{
                  position: "absolute",
                  top: 10,
                  right: 50,
                  zIndex: 1000,
                  bgcolor: "white",
                  borderRadius: 1,
                  boxShadow: 2,
                  p: showFilters ? 1.5 : 1,
                  minWidth: showFilters ? 220 : "auto",
                }}
              >
                {!showFilters && (
                  <IconButton size="small" onClick={() => setShowFilters(true)}>
                    <LayersIcon fontSize="small" />
                  </IconButton>
                )}
                {showFilters && (
                  <>
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
                      <Typography variant="caption" sx={{ fontWeight: "bold" }}>
                        Filters
                      </Typography>
                      <IconButton size="small" onClick={() => setShowFilters(false)}>
                        ✕
                      </IconButton>
                    </Box>
                    <Select
                      size="small"
                      multiple
                      value={selectedDays}
                      onChange={(e) => setSelectedDays(e.target.value as string[])}
                      displayEmpty
                      sx={{ width: "100%", mb: 1 }}
                      renderValue={(s) => (s.length === 0 ? "All days" : `${s.length} days`)}
                    >
                      {uniqueDays.map((day) => (
                        <MenuItem key={day.id} value={day.id}>
                          <Checkbox checked={selectedDays.includes(day.id)} />
                          <ListItemText primary={day.name} />
                        </MenuItem>
                      ))}
                    </Select>
                    <Select
                      size="small"
                      multiple
                      value={selectedMarkerLayers}
                      onChange={(e) => setSelectedMarkerLayers(e.target.value as string[])}
                      displayEmpty
                      sx={{ width: "100%" }}
                      renderValue={(s) => (s.length === 0 ? "Map Layers" : `${s.length} layers`)}
                    >
                      {regionsToShow.map((region) =>
                        MARKER_MANIFEST[region as keyof typeof MARKER_MANIFEST].map((file) => (
                          <MenuItem key={`${region}/${file}`} value={`${region}/${file}`}>
                            {region} - {file.replace(".json", "")}
                          </MenuItem>
                        )),
                      )}
                    </Select>
                  </>
                )}
              </Box>
              {selectedMarkerLayers.map((layerKey) => {
                const [region, file] = layerKey.split("/")
                return (
                  <GeoJSONLayer key={layerKey} url={`/markers/${region}/${file}`} onContextMenu={onMarkerContextMenu} />
                )
              })}
            </>
          )
        })()}

        {!isPlaying &&
          filteredActivities?.map(
            (activity) =>
              activity.latitude &&
              activity.longitude && (
                <Marker key={activity.id} position={[activity.latitude, activity.longitude]}>
                  <Popup>{activity.name}</Popup>
                </Marker>
              ),
          )}

        {activeAnimation && (
          <AdvancedAnimationLayer
            steps={activeAnimation.steps}
            isPlaying={isPlaying}
            onProgressUpdate={setAnimationProgress}
            onAnimationComplete={() => setIsPlaying(false)}
            seekProgress={seekProgress}
          />
        )}
      </MapContainer>
    </Paper>
  )
}
