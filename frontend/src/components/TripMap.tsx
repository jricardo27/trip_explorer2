import { Box, Typography, useTheme, Paper } from "@mui/material"
import L from "leaflet"
import "leaflet/dist/leaflet.css"
import { useEffect, useState, useCallback, useMemo, useRef } from "react"
import { MapContainer, LayersControl, TileLayer, useMap } from "react-leaflet"

import { useMapAnimation } from "../hooks/useMapAnimation"
import { useLanguageStore } from "../stores/languageStore"
import type { Activity, TripAnimation } from "../types"

import { AnimationController } from "./Map/Animation/AnimationController"
import { AnimationSettingsSidebar } from "./Map/Animation/AnimationSettingsSidebar"
import { BaseLayers } from "./Map/BaseLayers"
import { MapFlyHandler, MapStateManager } from "./Map/MapEventHandlers"
import { LIGHT_TILES, DARK_TILES } from "./Map/MapUtils"
import { TripMarkers } from "./Map/TripMarkers"
import { TripAnimationLayer } from "./TripAnimationLayer"

// Component to auto-fit map bounds to activities
const MapAutoFitter = ({ activities, viewMode }: { activities: Activity[]; viewMode?: string }) => {
  const map = useMap()
  const hasFittedRef = useRef(false)
  const activitiesRef = useRef(activities)

  useEffect(() => {
    // Check if activities effectively changed
    const prevIds = activitiesRef.current.map((a) => a.id).join(",")
    const currentIds = activities.map((a) => a.id).join(",")

    if (prevIds !== currentIds) {
      hasFittedRef.current = false
      activitiesRef.current = activities
    }
  }, [activities])

  useEffect(() => {
    if (viewMode === "animation") return
    if (hasFittedRef.current && activities.length > 0) return

    const validActivities = activities.filter((a) => a.latitude && a.longitude)
    if (validActivities.length === 0) return

    const coords = validActivities.map((a) => [Number(a.latitude), Number(a.longitude)] as [number, number])
    const bounds = L.latLngBounds(coords)

    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 6 })
      hasFittedRef.current = true
    }
  }, [activities, map, viewMode])

  return null
}

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
  selectedAnimationId?: string
  onSelectAnimation?: (id: string) => void
  onSaveAnimation?: (animation: Partial<TripAnimation>) => Promise<void>
  onDeleteAnimation?: (id: string) => Promise<void>
  canEdit?: boolean
  onActivityClick?: (activity: Activity) => void
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
    selectedAnimationId,
    onSelectAnimation,
    onSaveAnimation,
    onDeleteAnimation,
    canEdit = true,
    onActivityClick,
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
  const [titleVisible, setTitleVisible] = useState(false)
  const hideControlsTimerRef = useRef<any>(null)
  const hideTitleTimerRef = useRef<any>(null)

  const animation = useMapAnimation({
    animations,
    selectedAnimationId,
    onSaveAnimation,
    onDeleteAnimation,
  })

  // Sync fullscreen state
  useEffect(() => {
    const handleFullscreenChange = () => setIsFullScreen(!!document.fullscreenElement)
    document.addEventListener("fullscreenchange", handleFullscreenChange)
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange)
  }, [])

  // Ensure controls are visible when exiting fullscreen
  useEffect(() => {
    if (!isFullScreen) {
      const timer = setTimeout(() => setControlsVisible(true), 0)
      return () => clearTimeout(timer)
    }
  }, [isFullScreen])

  // Controls auto-hide visibility in fullscreen
  useEffect(() => {
    if (!isFullScreen) return

    const resetTimer = () => {
      setControlsVisible(true)
      if (hideControlsTimerRef.current) clearTimeout(hideControlsTimerRef.current)
      hideControlsTimerRef.current = setTimeout(() => {
        if (isFullScreen && animation.isPlaying) {
          setControlsVisible(false)
        }
      }, 3000)
    }

    const container = containerRef.current
    if (container) {
      container.addEventListener("mousemove", resetTimer)
      container.addEventListener("mousedown", resetTimer)
    }

    // Only show controls on mount if NOT playing (to avoid fade-in when starting)
    if (!animation.isPlaying) {
      resetTimer()
    }

    return () => {
      if (hideControlsTimerRef.current) clearTimeout(hideControlsTimerRef.current)
      if (container) {
        container.removeEventListener("mousemove", resetTimer)
        container.removeEventListener("mousedown", resetTimer)
      }
    }
  }, [isFullScreen, animation.isPlaying])

  // Title visibility control based on settings
  useEffect(() => {
    const mode = animation.settings.titleDisplayMode || "duration"
    const duration = (animation.settings.titleDisplayDuration || 5) * 1000 // Convert to ms

    // Clear any existing timer
    if (hideTitleTimerRef.current) {
      clearTimeout(hideTitleTimerRef.current)
      hideTitleTimerRef.current = null
    }

    if (!animation.isPlaying || !animation.currentAnimation) {
      const timer = setTimeout(() => setTitleVisible(false), 0)
      return () => clearTimeout(timer)
    }

    // Handle different display modes
    if (mode === "hide") {
      const timer = setTimeout(() => setTitleVisible(false), 0)
      return () => clearTimeout(timer)
    } else if (mode === "always") {
      const timer = setTimeout(() => setTitleVisible(true), 0)
      return () => clearTimeout(timer)
    } else if (mode === "duration") {
      const showTimer = setTimeout(() => setTitleVisible(true), 0)
      hideTitleTimerRef.current = setTimeout(() => {
        setTitleVisible(false)
      }, duration)

      return () => {
        clearTimeout(showTimer)
        if (hideTitleTimerRef.current) {
          clearTimeout(hideTitleTimerRef.current)
        }
      }
    }
  }, [
    animation.isPlaying,
    animation.currentAnimation,
    animation.settings.titleDisplayMode,
    animation.settings.titleDisplayDuration,
  ])

  const handleToggleFullScreen = useCallback(() => {
    if (!containerRef.current) return
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen()
    } else {
      document.exitFullscreen()
    }
  }, [])

  const sortedActivities = useMemo(() => {
    // If in animation mode and an animation is selected, only show activities from that animation
    if (viewMode === "animation" && animation.currentAnimation?.steps) {
      const animationActivityIds = new Set(
        animation.currentAnimation.steps.map((step) => step.activityId).filter(Boolean),
      )
      return (activities || [])
        .filter((a) => a.latitude && a.longitude && animationActivityIds.has(a.id))
        .sort((a, b) => {
          // Sort by the order in animation steps
          const indexA = animation.currentAnimation!.steps.findIndex((s) => s.activityId === a.id)
          const indexB = animation.currentAnimation!.steps.findIndex((s) => s.activityId === b.id)
          return indexA - indexB
        })
    }

    // Otherwise, show all activities sorted by time
    return (activities || [])
      .filter((a) => a.latitude && a.longitude)
      .sort((a, b) => {
        const timeA = a.scheduledStart ? new Date(a.scheduledStart).getTime() : 0
        const timeB = b.scheduledStart ? new Date(b.scheduledStart).getTime() : 0
        return timeA - timeB
      })
  }, [activities, viewMode, animation.currentAnimation])

  const handlePlayPauseWithDelay = useCallback(() => {
    // If starting play in fullscreen, hide immediately then delay the start
    if (!animation.isPlaying && isFullScreen) {
      setControlsVisible(false)
      setTimeout(() => {
        animation.setIsPlaying(true)
      }, 500) // Match the 0.5s transition in AnimationController
    } else {
      animation.handlePlayPause()
    }
  }, [animation, isFullScreen])

  const handleResetWithView = useCallback(() => {
    animation.handleReset()

    // If in fullscreen, reset the map view to show all activities
    if (isFullScreen && sortedActivities.length > 0) {
      const lats = sortedActivities.map((a) => a.latitude).filter(Boolean) as number[]
      const lngs = sortedActivities.map((a) => a.longitude).filter(Boolean) as number[]

      if (lats.length > 0 && lngs.length > 0) {
        const minLat = Math.min(...lats)
        const maxLat = Math.max(...lats)
        const minLng = Math.min(...lngs)
        const maxLng = Math.max(...lngs)

        const centerLat = (minLat + maxLat) / 2
        const centerLng = (minLng + maxLng) / 2

        // Calculate appropriate zoom level based on bounds
        // This is a simple heuristic; you might want to refine it
        const latDiff = maxLat - minLat
        const lngDiff = maxLng - minLng
        const maxDiff = Math.max(latDiff, lngDiff)

        let zoom = 10
        if (maxDiff < 0.01) zoom = 15
        else if (maxDiff < 0.05) zoom = 13
        else if (maxDiff < 0.1) zoom = 12
        else if (maxDiff < 0.5) zoom = 10
        else if (maxDiff < 1) zoom = 9
        else if (maxDiff < 5) zoom = 7
        else if (maxDiff < 10) zoom = 6
        else zoom = 5

        setMapState({ center: [centerLat, centerLng], zoom })
      }
    }
  }, [animation, isFullScreen, sortedActivities])

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
          setTimeout(() => setMapState({ center: [activity.latitude, activity.longitude], zoom: 14 }), 0)
        }
      }
    }
  }, [selectedActivityId, activities, animation.isPlaying, mapState.center])

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
        cursor: isFullScreen && !controlsVisible ? "none" : "auto",
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
            opacity: titleVisible ? 1 : 0,
          }}
        >
          <Typography variant="h5" sx={{ fontWeight: "bold" }}>
            {animation.currentAnimation?.name || title}
          </Typography>
        </Box>
      )}

      {!hideAnimationControl && viewMode === "animation" && sortedActivities.length > 0 && (
        <AnimationController
          isPlaying={animation.isPlaying}
          onPlayPause={handlePlayPauseWithDelay}
          onReset={handleResetWithView}
          isFullScreen={isFullScreen}
          onToggleFullScreen={handleToggleFullScreen}
          progress={animation.progress}
          t={t}
          onOpenSettings={() => setShowSettings(true)}
          visible={controlsVisible}
        />
      )}

      {viewMode === "animation" && (
        <AnimationSettingsSidebar
          settings={{
            name: animation.settings.name || "",
            transitionDuration: animation.settings.transitionDuration || 1.5,
            stayDuration: animation.settings.stayDuration || 2.0,
            speedFactor: animation.settings.speedFactor || 200,
            titleDisplayMode: animation.settings.titleDisplayMode || "duration",
            titleDisplayDuration: animation.settings.titleDisplayDuration || 5,
          }}
          onChange={(key, val) => animation.setSettings((prev: any) => ({ ...prev, [key]: val }))}
          isOpen={showSettings}
          onToggle={() => setShowSettings(!showSettings)}
          t={t}
          animations={animations}
          onSave={() => animation.handleSave(animation.settings.name || "")}
          onDelete={animation.handleDelete}
          onSelectAnimation={onSelectAnimation}
          currentAnimationId={selectedAnimationId}
          isSaving={animation.isSaving}
          visible={!isFullScreen && controlsVisible}
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
              key={animation.resetKey}
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

          <MapAutoFitter activities={sortedActivities} viewMode={viewMode} />

          {viewMode !== "animation" && sortedActivities.length > 0 && (
            <TripMarkers activities={sortedActivities} onActivityClick={onActivityClick} />
          )}
        </MapContainer>
      </Box>
    </Paper>
  )
}
