import { PlayArrow, Stop, Layers as LayersIcon } from "@mui/icons-material"
import { Box, Paper, Typography, IconButton, Select, MenuItem, Checkbox, ListItemText, useTheme } from "@mui/material"
import L from "leaflet"
import { useEffect, useState, useCallback, useMemo } from "react"
import { createRoot } from "react-dom/client"
import { renderToStaticMarkup } from "react-dom/server"
import { BsFuelPump } from "react-icons/bs"
import { MdHotel, MdKayaking, MdLocalGasStation, MdWc, MdPark, MdPlace } from "react-icons/md"
import { GeoJSON, MapContainer, Marker, Popup, TileLayer, useMap, useMapEvents, LayersControl } from "react-leaflet"
import "leaflet/dist/leaflet.css"

import { MARKER_MANIFEST } from "../data/markerManifest"
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
  progress,
  onSeek,
}: {
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
        Trip Animation
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
        {isPlaying ? <Stop /> : <PlayArrow />}
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
    days,
    onMapContextMenu,
    onMarkerContextMenu,
    onCreateActivity,
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
  const [isPlaying, setIsPlaying] = useState(false)
  const [animationProgress, setAnimationProgress] = useState(0)
  const [seekProgress, setSeekProgress] = useState<number | null>(null)
  const [selectedMarkerLayers, setSelectedMarkerLayers] = useState<string[]>([])
  const [selectedDays, setSelectedDays] = useState<string[]>([])
  const [showFilters, setShowFilters] = useState(true)

  // Sort activities for animation
  const sortedActivities = useMemo(
    () =>
      activities?.slice().sort((a, b) => {
        if (!a.scheduledStart || !b.scheduledStart) return 0
        return new Date(a.scheduledStart).getTime() - new Date(b.scheduledStart).getTime()
      }),
    [activities],
  )

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

  return (
    <Paper elevation={3} sx={{ p: 1, height: "100%", mb: 0, position: "relative", overflow: "hidden" }}>
      {!isPlaying && !hideAnimationControl && sortedActivities && sortedActivities.length > 0 && (
        <IconButton
          onClick={() => {
            setSeekProgress(0)
            setIsPlaying(true)
          }}
          color="primary"
          sx={{
            position: "absolute",
            top: 10,
            left: 60,
            zIndex: 1000,
            bgcolor: "primary.main",
            color: "white",
            "&:hover": { bgcolor: "primary.dark" },
            boxShadow: 3,
          }}
        >
          <PlayArrow />
        </IconButton>
      )}

      {isPlaying && (
        <AnimationController
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

        {isPlaying && sortedActivities && sortedActivities.length > 0 && (
          <TripAnimationLayer
            activities={sortedActivities}
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
