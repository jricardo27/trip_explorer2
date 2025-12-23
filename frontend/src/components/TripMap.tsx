import {
  PlayArrow,
  Stop,
  Layers as LayersIcon,
  Pause,
  Settings as SettingsIcon,
  Close,
  Fullscreen,
  FullscreenExit,
} from "@mui/icons-material"
import {
  Box,
  Paper,
  Typography,
  IconButton,
  Select,
  MenuItem,
  Checkbox,
  ListItemText,
  useTheme,
  Drawer,
  Slider,
  LinearProgress,
  Divider,
} from "@mui/material"
import L from "leaflet"
import { useEffect, useState, useCallback, useMemo, useRef } from "react"
import { createRoot } from "react-dom/client"
import { renderToStaticMarkup } from "react-dom/server"
import { BsFuelPump } from "react-icons/bs"
import { MdHotel, MdKayaking, MdLocalGasStation, MdWc, MdPark, MdPlace } from "react-icons/md"
import { GeoJSON, MapContainer, Marker, Popup, TileLayer, useMap, useMapEvents, LayersControl } from "react-leaflet"
import "leaflet/dist/leaflet.css"

import { MARKER_MANIFEST } from "../data/markerManifest"
import { useLanguageStore } from "../stores/languageStore"
import type { Activity } from "../types"

import { BaseLayers } from "./Map/BaseLayers"
import PopupContent from "./PopupContent"
import { TripAnimationLayer } from "./TripAnimationLayer"

interface TripMapProps {
  activities?: Activity[]
  selectedActivityId?: string
  days?: Array<{ id: string; name?: string; dayIndex: number }>
  onMapContextMenu?: (latLng: { lat: number; lng: number }) => void
  onMarkerContextMenu?: (feature: any) => void
  onCreateActivity?: (latLng: { lat: number; lng: number }) => void
  activeFlyToLocation?: { lat: number; lng: number } | null
  hideAnimationControl?: boolean
  viewMode?: string
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

const AnimationController = ({
  isPlaying,
  onPlayPause,
  onReset,
  isFullScreen,
  onToggleFullScreen,
  progress,
  t,
}: {
  isPlaying: boolean
  onPlayPause: () => void
  onReset: () => void
  isFullScreen: boolean
  onToggleFullScreen: () => void
  progress: number
  t: (key: any) => string
}) => (
  <Paper
    elevation={4}
    sx={{
      position: isFullScreen ? "absolute" : "relative",
      bottom: isFullScreen ? 30 : "auto",
      left: isFullScreen ? "50%" : "auto",
      transform: isFullScreen ? "translateX(-50%)" : "none",
      zIndex: 2000,
      p: 1.5,
      borderRadius: 2,
      display: "flex",
      flexDirection: "column",
      gap: 1,
      minWidth: isFullScreen ? 400 : "fit-content",
      bgcolor: "background.paper",
      boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
    }}
  >
    <Box display="flex" alignItems="center" gap={1}>
      <Typography variant="subtitle2" sx={{ fontWeight: "bold", mr: 1, whiteSpace: "nowrap" }}>
        {t("tripAnimation")}
      </Typography>
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
      <Box sx={{ flexGrow: 1 }} />
      <IconButton size="small" onClick={onToggleFullScreen} color="primary">
        {isFullScreen ? <FullscreenExit /> : <Fullscreen />}
      </IconButton>
      {isFullScreen && (
        <IconButton size="small" onClick={onToggleFullScreen} sx={{ color: "error.main" }}>
          <Close />
        </IconButton>
      )}
    </Box>
    <Box sx={{ width: "100%", mt: 0.5 }}>
      <LinearProgress
        variant="determinate"
        value={progress}
        sx={{
          height: 6,
          borderRadius: 3,
          bgcolor: "grey.200",
          "& .MuiLinearProgress-bar": {
            borderRadius: 3,
          },
        }}
      />
    </Box>
  </Paper>
)

const AnimationSettingsSidebar = ({
  settings,
  onChange,
  isOpen,
  onToggle,
  t,
}: {
  settings: { transitionDuration: number; stayDuration: number; speedFactor: number }
  days?: Array<{ id: string; name?: string; dayIndex: number }>
  onChange: (key: string, value: number) => void
  isOpen: boolean
  onToggle: () => void
  t: (key: any) => string
}) => (
  <>
    <IconButton
      onClick={onToggle}
      sx={{
        position: "absolute",
        top: 80,
        right: 12,
        zIndex: 1000,
        bgcolor: "white",
        boxShadow: 2,
        "&:hover": { bgcolor: "grey.100" },
      }}
    >
      <SettingsIcon />
    </IconButton>
    <Drawer anchor="right" open={isOpen} onClose={onToggle} PaperProps={{ sx: { width: 280, p: 3 } }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6">{t("animationSettings") || "Ajustes de Animación"}</Typography>
        <IconButton onClick={onToggle} size="small">
          <Close />
        </IconButton>
      </Box>
      <Divider sx={{ mb: 3 }} />

      <Box mb={4}>
        <Typography gutterBottom variant="subtitle2">
          {t("transitionDuration") || "Duración de Transición (s)"}
        </Typography>
        <Slider
          value={settings.transitionDuration}
          min={0.5}
          max={5}
          step={0.1}
          onChange={(_, val) => onChange("transitionDuration", val as number)}
          valueLabelDisplay="auto"
        />
      </Box>

      <Box mb={4}>
        <Typography gutterBottom variant="subtitle2">
          {t("stayDuration") || "Duración de Estancia (s)"}
        </Typography>
        <Slider
          value={settings.stayDuration}
          min={0.5}
          max={10}
          step={0.5}
          onChange={(_, val) => onChange("stayDuration", val as number)}
          valueLabelDisplay="auto"
        />
      </Box>

      <Box mb={4}>
        <Typography gutterBottom variant="subtitle2">
          {t("travelSpeed") || "Velocidad de Viaje"}
        </Typography>
        <Slider
          value={settings.speedFactor}
          min={50}
          max={500}
          step={10}
          onChange={(_, val) => onChange("speedFactor", val as number)}
          valueLabelDisplay="auto"
        />
      </Box>
    </Drawer>
  </>
)

// --- Main Component ---

export const TripMap = (props: TripMapProps) => {
  const { t } = useLanguageStore()
  const {
    activities,
    selectedActivityId,
    days,
    onMapContextMenu,
    onMarkerContextMenu,
    onCreateActivity,
    hideAnimationControl = false,
    viewMode,
  } = props
  const theme = useTheme()
  const tiles = theme.palette.mode === "light" ? LIGHT_TILES : DARK_TILES

  const containerRef = useRef<HTMLDivElement>(null)

  const [mapState, setMapState] = useState(() => {
    const saved = localStorage.getItem("mapState")
    return saved ? JSON.parse(saved) : { center: [-25.2744, 133.7751] as [number, number], zoom: 4 }
  })

  const [activeBaseLayer, setActiveBaseLayer] = useState(
    () => localStorage.getItem("activeBaseLayer") ?? "Esri World Street Map",
  )
  const [isPlaying, setIsPlaying] = useState(false)
  const [selectedMarkerLayers, setSelectedMarkerLayers] = useState<string[]>([])
  const [selectedDays, setSelectedDays] = useState<string[]>([])
  const [showFilters, setShowFilters] = useState(true)
  const [isFullScreen, setIsFullScreen] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [animationProgress, setAnimationProgress] = useState(0)

  const [animationSettings, setAnimationSettings] = useState({
    transitionDuration: 1.5,
    stayDuration: 2.0,
    speedFactor: 200,
  })

  // Sync fullscreen state with browser events
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullScreen(!!document.fullscreenElement)
    }
    document.addEventListener("fullscreenchange", handleFullscreenChange)
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange)
  }, [])

  const handleToggleFullScreen = useCallback(() => {
    if (!containerRef.current) return
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch((err) => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`)
      })
    } else {
      document.exitFullscreen()
    }
  }, [])

  // Sort activities for animation
  const sortedActivities = useMemo(() => {
    return (
      activities
        ?.filter((a) => a.latitude && a.longitude)
        .slice()
        .sort((a, b) => {
          const timeA = a.scheduledStart ? new Date(a.scheduledStart).getTime() : 0
          const timeB = b.scheduledStart ? new Date(b.scheduledStart).getTime() : 0
          if (timeA !== timeB) return timeA - timeB

          // Tie-break by day if possible
          if (a.tripDayId !== b.tripDayId) {
            const dayA = days?.find((d) => d.id === a.tripDayId)?.dayIndex ?? 0
            const dayB = days?.find((d) => d.id === b.tripDayId)?.dayIndex ?? 0
            return dayA - dayB
          }

          // Fallback to name or ID for stable sort
          return (a.name || "").localeCompare(b.name || "")
        }) || []
    )
  }, [activities, days])

  const handleMapMove = useCallback((center: [number, number], zoom: number) => {
    setMapState({ center, zoom })
    localStorage.setItem("mapState", JSON.stringify({ center, zoom }))
  }, [])

  useEffect(() => {
    localStorage.setItem("activeBaseLayer", activeBaseLayer)
  }, [activeBaseLayer])

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

  const handleAnimationComplete = useCallback(() => {
    setIsPlaying(false)
    if (isFullScreen) {
      handleToggleFullScreen()
    }
  }, [isFullScreen, handleToggleFullScreen])

  return (
    <Paper
      ref={containerRef}
      elevation={3}
      sx={{
        p: isFullScreen ? 0 : 1,
        height: isFullScreen ? "100vh" : "100%",
        mb: 0,
        position: isFullScreen ? "fixed" : "relative",
        top: isFullScreen ? 0 : "auto",
        left: isFullScreen ? 0 : "auto",
        width: isFullScreen ? "100vw" : "100%",
        zIndex: isFullScreen ? 1300 : 1,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        bgcolor: "background.paper",
      }}
    >
      {!hideAnimationControl && viewMode === "animation" && sortedActivities && sortedActivities.length > 0 && (
        <Box
          sx={{
            zIndex: 1001,
            position: isFullScreen ? "fixed" : "absolute",
            bottom: isFullScreen ? 30 : 20,
            left: "50%",
            transform: "translateX(-50%)",
            display: "flex",
            justifyContent: "center",
            width: "auto",
            pointerEvents: "none",
          }}
        >
          <Box sx={{ pointerEvents: "auto" }}>
            <AnimationController
              isPlaying={isPlaying}
              onPlayPause={() => setIsPlaying(!isPlaying)}
              onReset={() => {
                setIsPlaying(false)
                setAnimationProgress(0)
              }}
              isFullScreen={isFullScreen}
              onToggleFullScreen={handleToggleFullScreen}
              progress={animationProgress}
              t={t}
            />
          </Box>
        </Box>
      )}

      {viewMode === "animation" && !isPlaying && !isFullScreen && (
        <AnimationSettingsSidebar
          settings={animationSettings}
          onChange={(key, val) => setAnimationSettings((prev) => ({ ...prev, [key]: val }))}
          isOpen={showSettings}
          onToggle={() => setShowSettings(!showSettings)}
          t={t}
        />
      )}

      <Box sx={{ flexGrow: 1, position: "relative" }}>
        <MapContainer
          center={mapState.center}
          zoom={mapState.zoom}
          style={{ height: "100%", width: "100%" }}
          scrollWheelZoom={true}
        >
          <MapStateManager onMapMove={handleMapMove} onContextMenu={onCreateActivity || onMapContextMenu} />
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

          {/* Only show extra layers if NOT playing and NOT in animation mode */}
          {viewMode !== "animation" && !isPlaying && !isFullScreen && (
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
                        {t("filters")}
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
                      renderValue={(s) => (s.length === 0 ? t("allDays") : `${s.length} ${t("days")}`)}
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
                      renderValue={(s) => (s.length === 0 ? t("mapLayers") : `${s.length} ${t("layers")}`)}
                    >
                      {Object.keys(MARKER_MANIFEST).map((region) =>
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
          )}

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

          {sortedActivities && sortedActivities.length > 0 && (
            <TripAnimationLayer
              activities={sortedActivities}
              isPlaying={isPlaying}
              onAnimationComplete={handleAnimationComplete}
              onProgressUpdate={setAnimationProgress}
              settings={animationSettings}
            />
          )}
        </MapContainer>
      </Box>
    </Paper>
  )
}
