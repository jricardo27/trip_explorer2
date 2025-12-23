import {
  PlayArrow,
  Stop,
  Layers as LayersIcon,
  Pause,
  Settings as SettingsIcon,
  Close,
  Fullscreen,
  FullscreenExit,
  Info as InfoIcon,
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
  TextField,
  Button,
  CircularProgress,
  Tooltip,
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
import type { Activity, TripAnimation } from "../types"

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
  title?: string
  animations?: TripAnimation[]
  onSaveAnimation?: (animation: Partial<TripAnimation>) => Promise<void>
  onDeleteAnimation?: (id: string) => Promise<void>
  canEdit?: boolean
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
  onOpenSettings,
}: {
  isPlaying: boolean
  onPlayPause: () => void
  onReset: () => void
  isFullScreen: boolean
  onToggleFullScreen: () => void
  progress: number
  t: (key: any) => string
  onOpenSettings?: () => void
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
      alignItems: "center",
      gap: 1.5,
      minWidth: isFullScreen ? 350 : 280,
      bgcolor: "rgba(255,255,255,0.9)",
      backdropFilter: "blur(8px)",
      pointerEvents: "auto",
    }}
  >
    <IconButton onClick={onPlayPause} color="primary" size="small">
      {isPlaying ? <Pause /> : <PlayArrow />}
    </IconButton>
    <IconButton onClick={onReset} size="small">
      <Stop />
    </IconButton>
    {!isFullScreen && (
      <IconButton size="small" onClick={onOpenSettings}>
        <SettingsIcon />
      </IconButton>
    )}
    <Box sx={{ flexGrow: 1, px: 1, display: "flex", alignItems: "center" }}>
      <LinearProgress
        variant="determinate"
        value={progress}
        sx={{
          flexGrow: 1,
          height: 6,
          borderRadius: 3,
          bgcolor: "grey.200",
          "& .MuiLinearProgress-bar": {
            borderRadius: 3,
          },
        }}
      />
    </Box>
    <IconButton size="small" onClick={onToggleFullScreen}>
      {isFullScreen ? <FullscreenExit /> : <Fullscreen />}
    </IconButton>
    {isFullScreen && (
      <IconButton size="small" onClick={onToggleFullScreen} sx={{ color: "error.main" }}>
        <Close />
      </IconButton>
    )}
  </Paper>
)

const AnimationSettingsSidebar = ({
  settings,
  onChange,
  isOpen,
  onToggle,
  t,
  animations = [],
  onSave,
  onDelete,
  onSelectAnimation,
  currentAnimationId,
  isSaving = false,
}: {
  settings: { name: string; transitionDuration: number; stayDuration: number; speedFactor: number }
  onChange: (key: string, value: any) => void
  isOpen: boolean
  onToggle: () => void
  t: (key: any) => string
  animations?: TripAnimation[]
  onSave: () => void
  onDelete: () => void
  onSelectAnimation: (id: string) => void
  currentAnimationId?: string
  isSaving?: boolean
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

    <Drawer
      anchor="right"
      open={isOpen}
      onClose={onToggle}
      PaperProps={{
        sx: { width: 320, p: 3 },
      }}
    >
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h6">{t("animationSettings") || "Ajustes de Animación"}</Typography>
        <IconButton onClick={onToggle} size="small">
          <Close />
        </IconButton>
      </Box>

      {animations.length > 0 && (
        <Box mb={3}>
          <Typography gutterBottom variant="subtitle2">
            {t("savedAnimations") || "Animaciones Guardadas"}
          </Typography>
          <Select
            fullWidth
            size="small"
            value={currentAnimationId || ""}
            onChange={(e) => onSelectAnimation(e.target.value)}
            displayEmpty
          >
            <MenuItem value="" disabled>
              {t("selectAnimation") || "Seleccionar..."}
            </MenuItem>
            {animations.map((anim) => (
              <MenuItem key={anim.id} value={anim.id}>
                {anim.name}
              </MenuItem>
            ))}
            <MenuItem
              value="new"
              sx={{ fontStyle: "italic", color: "primary.main" }}
              onClick={() => onSelectAnimation("new")}
            >
              + {t("createNew") || "Crear Nueva"}
            </MenuItem>
          </Select>
        </Box>
      )}

      <Divider sx={{ mb: 3 }} />

      <Box mb={3}>
        <Box display="flex" alignItems="center" gap={0.5} mb={1}>
          <Typography variant="subtitle2">{t("animationName") || "Nombre de la Animación"}</Typography>
          <Tooltip title={t("animationNameTooltip")}>
            <InfoIcon sx={{ fontSize: 16, color: "text.secondary", cursor: "help" }} />
          </Tooltip>
        </Box>
        <TextField
          fullWidth
          variant="outlined"
          size="small"
          value={settings.name}
          onChange={(e) => onChange("name", e.target.value)}
        />
      </Box>

      <Box mb={3}>
        <Box display="flex" alignItems="center" gap={0.5} mb={1}>
          <Typography variant="subtitle2">{t("transitionDuration") || "Duración de Transición (s)"}</Typography>
          <Tooltip title={t("transitionDurationTooltip")}>
            <InfoIcon sx={{ fontSize: 16, color: "text.secondary", cursor: "help" }} />
          </Tooltip>
        </Box>
        <Slider
          value={settings.transitionDuration}
          min={0.5}
          max={5}
          step={0.1}
          onChange={(_, val) => onChange("transitionDuration", val as number)}
          valueLabelDisplay="auto"
        />
      </Box>

      <Box mb={3}>
        <Box display="flex" alignItems="center" gap={0.5} mb={1}>
          <Typography variant="subtitle2">{t("stayDuration") || "Tiempo en Actividad (s)"}</Typography>
          <Tooltip title={t("stayDurationTooltip")}>
            <InfoIcon sx={{ fontSize: 16, color: "text.secondary", cursor: "help" }} />
          </Tooltip>
        </Box>
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
        <Box display="flex" alignItems="center" gap={0.5} mb={1}>
          <Typography variant="subtitle2">{t("travelSpeed") || "Velocidad de Viaje"}</Typography>
          <Tooltip title={t("travelSpeedTooltip")}>
            <InfoIcon sx={{ fontSize: 16, color: "text.secondary", cursor: "help" }} />
          </Tooltip>
        </Box>
        <Slider
          value={settings.speedFactor}
          min={50}
          max={500}
          step={10}
          onChange={(_, val) => onChange("speedFactor", val as number)}
          valueLabelDisplay="auto"
        />
      </Box>

      <Box sx={{ display: "flex", gap: 1, mt: "auto" }}>
        <Button
          fullWidth
          variant="contained"
          onClick={onSave}
          disabled={isSaving || !settings.name}
          startIcon={isSaving ? <CircularProgress size={20} /> : null}
        >
          {t("save") || "Guardar"}
        </Button>
        {currentAnimationId && (
          <Button fullWidth variant="outlined" color="error" onClick={onDelete}>
            {t("delete") || "Borrar"}
          </Button>
        )}
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
    title,
    animations = [],
    onSaveAnimation,
    onDeleteAnimation,
    canEdit = true,
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
    name: "",
    transitionDuration: 1.5,
    stayDuration: 2.0,
    speedFactor: 200,
  })

  const [currentAnimationId, setCurrentAnimationId] = useState<string | undefined>(undefined)
  const [isSaving, setIsSaving] = useState(false)

  const [controlsVisible, setControlsVisible] = useState(true)
  const hideControlsTimerRef = useRef<any>(null)

  // Sync fullscreen state with browser events
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullScreen(!!document.fullscreenElement)
    }
    document.addEventListener("fullscreenchange", handleFullscreenChange)
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange)
  }, [])

  // Handle controls visibility in fullscreen
  useEffect(() => {
    if (!isFullScreen) {
      setControlsVisible(true)
      if (hideControlsTimerRef.current) clearTimeout(hideControlsTimerRef.current)
      return
    }

    const resetTimer = () => {
      setControlsVisible(true)
      if (hideControlsTimerRef.current) clearTimeout(hideControlsTimerRef.current)
      hideControlsTimerRef.current = setTimeout(() => {
        setControlsVisible(false)
      }, 3000)
    }

    const container = containerRef.current
    if (container) {
      container.addEventListener("mousemove", resetTimer)
      container.addEventListener("mousedown", resetTimer)
      container.addEventListener("touchstart", resetTimer)
    }

    resetTimer()

    return () => {
      if (container) {
        container.removeEventListener("mousemove", resetTimer)
        container.removeEventListener("mousedown", resetTimer)
        container.removeEventListener("touchstart", resetTimer)
      }
      if (hideControlsTimerRef.current) clearTimeout(hideControlsTimerRef.current)
    }
  }, [isFullScreen])

  // Handle loading an animation when selecting it
  const handleSelectAnimation = useCallback(
    (id: string) => {
      if (id === "new") {
        setCurrentAnimationId(undefined)
        setAnimationSettings({
          name: "",
          transitionDuration: 1.5,
          stayDuration: 2.0,
          speedFactor: 200,
        })
        return
      }

      const anim = animations.find((a) => a.id === id)
      if (anim) {
        setCurrentAnimationId(anim.id)
        setAnimationSettings({
          name: anim.name,
          transitionDuration: anim.settings.transitionDuration || 1.5,
          stayDuration: anim.settings.stayDuration || 2.0,
          speedFactor: anim.settings.speedFactor || 200,
        })
      }
    },
    [animations],
  )

  const handleSave = async () => {
    if (!onSaveAnimation || !animationSettings.name) return
    setIsSaving(true)
    try {
      const data = {
        id: currentAnimationId,
        name: animationSettings.name,
        settings: {
          transitionDuration: animationSettings.transitionDuration,
          stayDuration: animationSettings.stayDuration,
          speedFactor: animationSettings.speedFactor,
        },
        steps: sortedActivities?.map((a) => ({ activityId: a.id })),
      }
      await onSaveAnimation(data as any)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!onDeleteAnimation || !currentAnimationId) return
    if (window.confirm(t("areYouSureDeleteAnimation") || "¿Borrar esta animación?")) {
      await onDeleteAnimation(currentAnimationId)
      handleSelectAnimation("new")
    }
  }

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
        // Hide Leaflet controls in fullscreen
        "& .leaflet-control-zoom, & .leaflet-control-layers": {
          display: isFullScreen ? "none" : "block",
        },
      }}
    >
      {isFullScreen && title && (
        <Box
          sx={{
            position: "absolute",
            top: 20,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 2000,
            bgcolor: "rgba(0,0,0,0.6)",
            color: "white",
            px: 4,
            py: 1.5,
            borderRadius: 4,
            backdropFilter: "blur(8px)",
            pointerEvents: "none",
            transition: "opacity 0.5s",
            opacity: controlsVisible ? 1 : 0,
          }}
        >
          <Typography variant="h5" sx={{ fontWeight: "bold", letterSpacing: "0.5px" }}>
            {animationSettings.name || title}
          </Typography>
        </Box>
      )}

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
            transition: "opacity 0.5s",
            opacity: isFullScreen && !controlsVisible ? 0 : 1,
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
              onOpenSettings={() => setShowSettings(true)}
            />
          </Box>
        </Box>
      )}

      {viewMode === "animation" && (
        <AnimationSettingsSidebar
          settings={animationSettings}
          onChange={(key, val) => setAnimationSettings((prev) => ({ ...prev, [key]: val }))}
          isOpen={showSettings}
          onToggle={() => setShowSettings(!showSettings)}
          t={t}
          animations={animations}
          onSave={handleSave}
          onDelete={handleDelete}
          onSelectAnimation={handleSelectAnimation}
          currentAnimationId={currentAnimationId}
          isSaving={isSaving}
        />
      )}

      <Box sx={{ flexGrow: 1, position: "relative" }}>
        <MapContainer
          center={mapState.center}
          zoom={mapState.zoom}
          style={{ height: "100%", width: "100%" }}
          scrollWheelZoom={true}
        >
          <MapStateManager
            onMapMove={handleMapMove}
            onContextMenu={(latLng) => {
              if (canEdit && (onCreateActivity || onMapContextMenu)) {
                ;(onCreateActivity || onMapContextMenu)?.(latLng)
              }
            }}
          />
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
