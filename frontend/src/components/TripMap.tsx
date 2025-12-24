import { Box, Typography, useTheme, Paper } from "@mui/material"
import "leaflet/dist/leaflet.css"
import { useEffect, useState, useCallback, useMemo, useRef } from "react"
import { MapContainer, LayersControl, TileLayer } from "react-leaflet"

import { useMapAnimation } from "../hooks/useMapAnimation"
import { useLanguageStore } from "../stores/languageStore"
import type { Activity, TripAnimation } from "../types"

import { AnimationController } from "./Map/Animation/AnimationController"
import { AnimationSettingsSidebar } from "./Map/Animation/AnimationSettingsSidebar"
import { BaseLayers } from "./Map/BaseLayers"
import { MapFlyHandler, MapStateManager } from "./Map/MapEventHandlers"
import { LIGHT_TILES, DARK_TILES } from "./Map/MapUtils"
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

export const TripMap = (props: TripMapProps) => {
  const { t } = useLanguageStore()
  const {
    activities,
    selectedActivityId,
    onMapContextMenu,
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

  const [isFullScreen, setIsFullScreen] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [controlsVisible, setControlsVisible] = useState(true)
  const hideControlsTimerRef = useRef<any>(null)

  const animation = useMapAnimation({
    animations,
    onSaveAnimation,
    onDeleteAnimation,
  })

  // Sync fullscreen state
  useEffect(() => {
    const handleFullscreenChange = () => setIsFullScreen(!!document.fullscreenElement)
    document.addEventListener("fullscreenchange", handleFullscreenChange)
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange)
  }, [])

  // Controls visibility in fullscreen
  useEffect(() => {
    if (!isFullScreen) {
      if (!controlsVisible) setControlsVisible(true)
      return
    }
    const resetTimer = () => {
      setControlsVisible(true)
      if (hideControlsTimerRef.current) clearTimeout(hideControlsTimerRef.current)
      hideControlsTimerRef.current = setTimeout(() => setControlsVisible(false), 3000)
    }
    const container = containerRef.current
    if (container) {
      container.addEventListener("mousemove", resetTimer)
      container.addEventListener("mousedown", resetTimer)
    }
    resetTimer()
    return () => {
      if (container) {
        container.removeEventListener("mousemove", resetTimer)
        container.removeEventListener("mousedown", resetTimer)
      }
    }
  }, [isFullScreen, controlsVisible])

  const handleToggleFullScreen = useCallback(() => {
    if (!containerRef.current) return
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen()
    } else {
      document.exitFullscreen()
    }
  }, [])

  const handleMapMove = useCallback((center: [number, number], zoom: number) => {
    setMapState({ center, zoom })
    localStorage.setItem("mapState", JSON.stringify({ center, zoom }))
  }, [])

  useEffect(() => {
    localStorage.setItem("activeBaseLayer", activeBaseLayer)
  }, [activeBaseLayer])

  // Fly to selected activity
  useEffect(() => {
    if (!animation.isPlaying && selectedActivityId) {
      const activity = activities?.find((a) => a.id === selectedActivityId)
      if (activity?.latitude && activity?.longitude) {
        const currentCenter = mapState.center
        if (currentCenter[0] !== activity.latitude || currentCenter[1] !== activity.longitude) {
          setMapState({ center: [activity.latitude, activity.longitude], zoom: 14 })
        }
      }
    }
  }, [selectedActivityId, activities, animation.isPlaying, mapState.center])

  const sortedActivities = useMemo(() => {
    return (activities || [])
      .filter((a) => a.latitude && a.longitude)
      .sort((a, b) => {
        const timeA = a.scheduledStart ? new Date(a.scheduledStart).getTime() : 0
        const timeB = b.scheduledStart ? new Date(b.scheduledStart).getTime() : 0
        return timeA - timeB
      })
  }, [activities])

  return (
    <Paper
      ref={containerRef}
      elevation={3}
      sx={{
        p: isFullScreen ? 0 : 1,
        height: isFullScreen ? "100vh" : "100%",
        position: isFullScreen ? "fixed" : "relative",
        top: isFullScreen ? 0 : "auto",
        left: isFullScreen ? 0 : "auto",
        width: isFullScreen ? "100vw" : "100%",
        zIndex: isFullScreen ? 1300 : 1,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        bgcolor: "background.paper",
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
          <Typography variant="h5" sx={{ fontWeight: "bold" }}>
            {animation.currentAnimation?.name || title}
          </Typography>
        </Box>
      )}

      {!hideAnimationControl && viewMode === "animation" && sortedActivities.length > 0 && (
        <Box
          sx={{
            zIndex: 1001,
            position: "absolute",
            bottom: isFullScreen ? 30 : 20,
            left: "50%",
            transform: "translateX(-50%)",
            width: "auto",
            transition: "opacity 0.5s",
            opacity: isFullScreen && !controlsVisible ? 0 : 1,
          }}
        >
          <AnimationController
            isPlaying={animation.isPlaying}
            onPlayPause={animation.handlePlayPause}
            onReset={animation.handleReset}
            isFullScreen={isFullScreen}
            onToggleFullScreen={handleToggleFullScreen}
            progress={animation.progress}
            t={t}
            onOpenSettings={() => setShowSettings(true)}
          />
        </Box>
      )}

      {viewMode === "animation" && (
        <AnimationSettingsSidebar
          settings={{
            name: animation.settings.name || "",
            transitionDuration: animation.settings.transitionDuration || 1.5,
            stayDuration: animation.settings.stayDuration || 2.0,
            speedFactor: animation.settings.speedFactor || 200,
          }}
          onChange={(key, val) => animation.setSettings((prev: any) => ({ ...prev, [key]: val }))}
          isOpen={showSettings}
          onToggle={() => setShowSettings(!showSettings)}
          t={t}
          animations={animations}
          onSave={() => animation.handleSave(animation.settings.name || "")}
          onDelete={animation.handleDelete}
          onSelectAnimation={(id) => animation.setCurrentAnimationId(id)}
          currentAnimationId={animation.currentAnimationId}
          isSaving={animation.isSaving}
        />
      )}

      <Box sx={{ flexGrow: 1, position: "relative" }}>
        <MapContainer center={mapState.center} zoom={mapState.zoom} style={{ height: "100%", width: "100%" }}>
          <MapStateManager
            onMapMove={handleMapMove}
            onContextMenu={(latLng) => {
              if (canEdit) (onCreateActivity || onMapContextMenu)?.(latLng)
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

          {viewMode === "animation" && sortedActivities.length > 0 && (
            <TripAnimationLayer
              activities={sortedActivities}
              isPlaying={animation.isPlaying}
              onAnimationComplete={() => {
                animation.setIsPlaying(false)
                if (isFullScreen) handleToggleFullScreen()
              }}
              onProgressUpdate={(p) => animation.setProgress(p / 100)}
              settings={{
                transitionDuration: animation.settings.transitionDuration || 1.5,
                stayDuration: animation.settings.stayDuration || 2.0,
                speedFactor: animation.settings.speedFactor || 200,
              }}
            />
          )}
        </MapContainer>
      </Box>
    </Paper>
  )
}
