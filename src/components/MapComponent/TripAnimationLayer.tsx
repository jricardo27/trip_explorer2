import L from "leaflet"
import React, { useEffect, useState, useRef, useMemo, useCallback } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { MdLocationCity } from "react-icons/md"
import { Marker, Polyline, useMap, Tooltip as LeafletTooltip } from "react-leaflet"

import { getTransportIconComponent } from "../../constants/transportModes"
import { getTravelIcon } from "../../constants/travelIcons"
import { DayLocation, TripFeature, AnimationConfig } from "../../contexts/TripContext"

interface TripAnimationLayerProps {
  items: (DayLocation | TripFeature)[]
  isPlaying: boolean
  speed: number
  onProgressUpdate: (progress: number) => void
  seekProgress: number | null // 0-100
  onAnimationComplete: () => void
  globalConfig?: AnimationConfig
}

// Zoom phases
enum ZoomPhase {
  INITIAL_ZOOM_OUT = 1,
  ZOOM_TO_START = 2,
  ZOOM_OUT_TO_BOTH = 3,
  MAINTAIN = 4,
  ZOOM_TO_DEST = 5,
}

// Helper to get coordinates from item
const getCoords = (item: DayLocation | TripFeature): [number, number] | null => {
  if ("latitude" in item && "longitude" in item && item.latitude && item.longitude) {
    return [Number(item.latitude), Number(item.longitude)]
  }
  if ("geometry" in item && item.geometry?.coordinates) {
    return [Number(item.geometry.coordinates[1]), Number(item.geometry.coordinates[0])]
  }
  return null
}

// Helper to calculate distance between two points
const getDistance = (p1: [number, number], p2: [number, number]) => {
  return L.latLng(p1).distanceTo(L.latLng(p2))
}

export const TripAnimationLayer: React.FC<TripAnimationLayerProps> = ({
  items,
  isPlaying,
  speed: globalSpeedMultiplier,
  onProgressUpdate,
  seekProgress,
  onAnimationComplete,
  globalConfig,
}) => {
  const map = useMap()
  const [currentSegmentIndex, setCurrentSegmentIndex] = useState(0)
  const [segmentProgress, setSegmentProgress] = useState(0) // 0 to 1
  const [isPaused, setIsPaused] = useState(false)
  const [pauseStartTime, setPauseStartTime] = useState<number | null>(null)
  const [zoomPhase, setZoomPhase] = useState<ZoomPhase>(ZoomPhase.INITIAL_ZOOM_OUT)
  const [initialZoomComplete, setInitialZoomComplete] = useState(false)
  const requestRef = useRef<number | null>(null)
  const previousTimeRef = useRef<number | undefined>(undefined)

  // Filter items with valid coordinates
  const validItems = useMemo(() => items.filter((item) => getCoords(item) !== null), [items])
  const coords = useMemo(() => validItems.map((item) => getCoords(item)!), [validItems])

  // Calculate total distance for progress bar
  const totalDistance = useMemo(() => {
    let dist = 0
    for (let i = 0; i < coords.length - 1; i++) {
      dist += getDistance(coords[i], coords[i + 1])
    }
    return dist
  }, [coords])

  // Handle seeking
  useEffect(() => {
    if (seekProgress !== null) {
      const targetDist = (seekProgress / 100) * totalDistance
      let currentDist = 0
      for (let i = 0; i < coords.length - 1; i++) {
        const segDist = getDistance(coords[i], coords[i + 1])
        if (currentDist + segDist >= targetDist) {
          setCurrentSegmentIndex(i)
          setSegmentProgress((targetDist - currentDist) / segDist)
          setIsPaused(false)
          setZoomPhase(ZoomPhase.MAINTAIN)
          return
        }
        currentDist += segDist
      }
      setCurrentSegmentIndex(coords.length - 2)
      setSegmentProgress(1)
    }
  }, [seekProgress, coords, totalDistance])

  // Handle zoom based on phase and progress
  useEffect(() => {
    if (!isPlaying || coords.length < 2 || currentSegmentIndex >= coords.length - 1) return

    const origin = coords[currentSegmentIndex]
    const destination = coords[currentSegmentIndex + 1]

    switch (zoomPhase) {
      case ZoomPhase.INITIAL_ZOOM_OUT:
      case ZoomPhase.ZOOM_OUT_TO_BOTH: {
        // Show both nodes - slower zoom (2 seconds)
        const bounds = L.latLngBounds([origin, destination])
        map.fitBounds(bounds, { padding: [100, 100], animate: true, duration: 2 })
        break
      }
      case ZoomPhase.ZOOM_TO_START: {
        // Zoom to origin
        map.flyTo(origin, 14, { animate: true, duration: 1 })
        break
      }
      case ZoomPhase.MAINTAIN: {
        // No zoom change
        break
      }
      case ZoomPhase.ZOOM_TO_DEST: {
        // Gradually zoom to destination - only trigger once when entering this phase
        if (segmentProgress >= 0.66 && segmentProgress < 0.67) {
          map.flyTo(destination, 14, { animate: true, duration: 3 })
        }
        break
      }
    }
  }, [zoomPhase, currentSegmentIndex, coords, map, isPlaying, segmentProgress])

  // Animation Loop
  const animate = useCallback(
    (time: number) => {
      if (previousTimeRef.current !== undefined) {
        const deltaTime = time - previousTimeRef.current

        // Handle pause on arrival
        if (isPaused && pauseStartTime !== null) {
          const currentItem = validItems[currentSegmentIndex + 1]
          const pauseDuration =
            (currentItem.animation_config?.pauseOnArrival ?? globalConfig?.pauseOnArrival ?? 6) * 1000

          if (time - pauseStartTime >= pauseDuration) {
            setIsPaused(false)
            setPauseStartTime(null)

            if (currentSegmentIndex < coords.length - 2) {
              setCurrentSegmentIndex((prev) => prev + 1)
              setSegmentProgress(0)
              setZoomPhase(ZoomPhase.INITIAL_ZOOM_OUT)
            } else {
              onAnimationComplete()
              return
            }
          }
        }

        // Handle movement and phase transitions (only after initial zoom completes)
        if (!isPaused && initialZoomComplete && currentSegmentIndex < coords.length - 1) {
          const currentItem = validItems[currentSegmentIndex]
          const itemSpeed = currentItem.animation_config?.speed || globalConfig?.speed || 1

          let effectiveSpeed = 500000 * globalSpeedMultiplier * itemSpeed

          // Slowdown when approaching (last 20% of segment)
          if (segmentProgress > 0.8) {
            const slowdownFactor = 1 - ((segmentProgress - 0.8) / 0.2) * 0.7
            effectiveSpeed *= slowdownFactor
          }

          const p1 = coords[currentSegmentIndex]
          const p2 = coords[currentSegmentIndex + 1]
          const segmentDist = getDistance(p1, p2)

          if (segmentDist > 0) {
            // Ensure minimum animation time of 3 seconds per segment
            // Calculate max speed allowed to take at least 3 seconds
            const maxSpeedForMinTime = segmentDist / 3 // meters per second
            // Use the SLOWER of the two speeds (min of the speeds)
            const actualSpeed = Math.min(effectiveSpeed, maxSpeedForMinTime)
            const actualDistanceToTravel = (actualSpeed * deltaTime) / 1000

            const progressIncrement = actualDistanceToTravel / segmentDist
            const newProgress = segmentProgress + progressIncrement

            // Phase transitions based on progress
            if (newProgress < 0.33) {
              // First third - zoom out to both phase
              if (zoomPhase === ZoomPhase.INITIAL_ZOOM_OUT) {
                setZoomPhase(ZoomPhase.ZOOM_OUT_TO_BOTH)
              }
            } else if (newProgress >= 0.33 && newProgress < 0.66 && zoomPhase !== ZoomPhase.MAINTAIN) {
              setZoomPhase(ZoomPhase.MAINTAIN)
            } else if (newProgress >= 0.66 && zoomPhase !== ZoomPhase.ZOOM_TO_DEST) {
              setZoomPhase(ZoomPhase.ZOOM_TO_DEST)
            }

            if (newProgress >= 1) {
              setSegmentProgress(1)
              setIsPaused(true)
              setPauseStartTime(time)
            } else {
              setSegmentProgress(newProgress)
            }
          } else {
            // Zero distance segment, skip
            if (currentSegmentIndex < coords.length - 2) {
              setCurrentSegmentIndex((prev) => prev + 1)
              setSegmentProgress(0)
              setZoomPhase(ZoomPhase.INITIAL_ZOOM_OUT)
            }
          }
        }
      }
      previousTimeRef.current = time
      requestRef.current = requestAnimationFrame(animate)
    },
    [
      coords,
      currentSegmentIndex,
      globalConfig?.pauseOnArrival,
      globalConfig?.speed,
      globalSpeedMultiplier,
      initialZoomComplete,
      isPaused,
      onAnimationComplete,
      pauseStartTime,
      segmentProgress,
      validItems,
      zoomPhase,
    ],
  )

  useEffect(() => {
    if (isPlaying && coords.length > 1) {
      requestRef.current = requestAnimationFrame(animate)
    } else {
      if (requestRef.current) cancelAnimationFrame(requestRef.current)
      previousTimeRef.current = undefined
    }
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current)
    }
  }, [
    isPlaying,
    coords,
    currentSegmentIndex,
    segmentProgress,
    isPaused,
    zoomPhase,
    globalSpeedMultiplier,
    globalConfig,
    validItems,
    animate,
  ])

  // Calculate current position
  const currentPosition = useMemo(() => {
    if (coords.length < 2) return null
    if (currentSegmentIndex >= coords.length - 1) return coords[coords.length - 1]

    const p1 = coords[currentSegmentIndex]
    const p2 = coords[currentSegmentIndex + 1]

    const lat = p1[0] + (p2[0] - p1[0]) * segmentProgress
    const lng = p1[1] + (p2[1] - p1[1]) * segmentProgress

    return [lat, lng] as [number, number]
  }, [coords, currentSegmentIndex, segmentProgress])

  // Update global progress (time-based to account for minimum segment duration)
  useEffect(() => {
    if (coords.length < 2) return

    // Calculate total expected time for all segments
    let totalExpectedTime = 0
    for (let i = 0; i < coords.length - 1; i++) {
      const segDist = getDistance(coords[i], coords[i + 1])
      const item = validItems[i]
      const itemSpeed = item.animation_config?.speed || globalConfig?.speed || 1
      const baseSpeed = 500000 * globalSpeedMultiplier * itemSpeed
      const maxSpeedForMinTime = segDist / 3
      const actualSpeed = Math.min(baseSpeed, maxSpeedForMinTime)
      const segmentTime = segDist / actualSpeed
      totalExpectedTime += segmentTime
    }

    // Calculate time elapsed up to current position
    let timeElapsed = 0
    for (let i = 0; i < currentSegmentIndex; i++) {
      const segDist = getDistance(coords[i], coords[i + 1])
      const item = validItems[i]
      const itemSpeed = item.animation_config?.speed || globalConfig?.speed || 1
      const baseSpeed = 500000 * globalSpeedMultiplier * itemSpeed
      const maxSpeedForMinTime = segDist / 3
      const actualSpeed = Math.min(baseSpeed, maxSpeedForMinTime)
      const segmentTime = segDist / actualSpeed
      timeElapsed += segmentTime
    }

    // Add current segment progress
    if (currentSegmentIndex < coords.length - 1) {
      const currentSegDist = getDistance(coords[currentSegmentIndex], coords[currentSegmentIndex + 1])
      const currentItem = validItems[currentSegmentIndex]
      const currentItemSpeed = currentItem.animation_config?.speed || globalConfig?.speed || 1
      const currentBaseSpeed = 500000 * globalSpeedMultiplier * currentItemSpeed
      const currentMaxSpeed = currentSegDist / 3
      const currentActualSpeed = Math.min(currentBaseSpeed, currentMaxSpeed)
      const currentSegmentTime = currentSegDist / currentActualSpeed
      timeElapsed += currentSegmentTime * segmentProgress
    }

    const totalProgress = totalExpectedTime > 0 ? (timeElapsed / totalExpectedTime) * 100 : 0
    onProgressUpdate(totalProgress)
  }, [currentSegmentIndex, segmentProgress, coords, validItems, globalConfig, globalSpeedMultiplier, onProgressUpdate])

  // Initialize zoom phases when starting
  useEffect(() => {
    if (isPlaying) {
      // Only do the zoom sequence if we're at the very beginning
      if (currentSegmentIndex === 0 && segmentProgress === 0) {
        const shouldZoomAtStart = globalConfig?.zoomAtStart ?? true
        if (shouldZoomAtStart && coords.length > 1) {
          setInitialZoomComplete(false)
          setZoomPhase(ZoomPhase.ZOOM_TO_START)
          // After 1 second, transition to zoom out to both
          setTimeout(() => {
            setZoomPhase(ZoomPhase.ZOOM_OUT_TO_BOTH)
            // After 2 seconds (slower zoom), mark initial zoom as complete
            setTimeout(() => {
              setInitialZoomComplete(true)
            }, 2000)
          }, 1000)
        } else {
          // If not zooming at start, mark as complete immediately
          setInitialZoomComplete(true)
        }
      } else {
        // If we're not at the start, skip the zoom sequence
        setInitialZoomComplete(true)
      }
    } else {
      // When not playing, reset to allow restart
      if (currentSegmentIndex === 0 && segmentProgress === 0) {
        setInitialZoomComplete(false)
      }
    }
  }, [isPlaying, currentSegmentIndex, segmentProgress, globalConfig, coords])

  // Zoom out at end if configured
  useEffect(() => {
    if (currentSegmentIndex >= coords.length - 2 && segmentProgress >= 1) {
      const shouldZoomOutAtEnd = globalConfig?.zoomOutAtEnd ?? true
      if (shouldZoomOutAtEnd && coords.length > 1) {
        const bounds = L.latLngBounds(coords)
        map.fitBounds(bounds, { padding: [50, 50], animate: true, duration: 3 })
      }
    }
  }, [currentSegmentIndex, segmentProgress, coords, map, globalConfig])

  // Determine moving icon based on config and transport mode
  const movingIcon = useMemo(() => {
    const defaultIcon = globalConfig?.defaultTravelIcon || "person"

    if (currentSegmentIndex < validItems.length - 1) {
      const nextItem = validItems[currentSegmentIndex + 1]
      const mode = nextItem.transport_mode
      const IconComp = getTransportIconComponent(mode)
      if (IconComp) return <IconComp />
    }

    const TravelIcon = getTravelIcon(defaultIcon)
    return <TravelIcon />
  }, [currentSegmentIndex, validItems, globalConfig])

  const divIcon = useMemo(() => {
    const html = renderToStaticMarkup(
      <div
        style={{
          color: "#1976d2",
          fontSize: "24px",
          background: "white",
          borderRadius: "50%",
          padding: "4px",
          boxShadow: "0 2px 5px rgba(0,0,0,0.3)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {movingIcon}
      </div>,
    )
    return L.divIcon({
      html: html,
      className: "trip-animation-icon",
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    })
  }, [movingIcon])

  // Create static location markers with city icons in white circles
  const locationIcon = useMemo(() => {
    const html = renderToStaticMarkup(
      <div
        style={{
          color: "#f44336",
          fontSize: "24px",
          background: "white",
          borderRadius: "50%",
          padding: "6px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 2px 4px rgba(0,0,0,0.3)",
        }}
      >
        <MdLocationCity />
      </div>,
    )
    return L.divIcon({
      html: html,
      className: "location-icon",
      iconSize: [36, 36],
      iconAnchor: [18, 36],
    })
  }, [])

  if (coords.length < 2) return null

  // Show moving marker only after initial zoom completes and when not paused
  const showMovingMarker =
    !isPaused &&
    initialZoomComplete &&
    (isPlaying || (seekProgress !== null && seekProgress > 0) || currentSegmentIndex > 0 || segmentProgress > 0)

  return (
    <>
      {/* Animated Path - draws from start to current position (only after initial zoom) */}
      {currentPosition && coords.length > 0 && initialZoomComplete && (
        <Polyline
          positions={[coords[0], ...coords.slice(1, currentSegmentIndex + 1), currentPosition]}
          pathOptions={{ color: "#1976d2", weight: 4, opacity: 0.8 }}
        />
      )}

      {/* Remaining path preview (faint dashed line) */}
      {coords.length > currentSegmentIndex + 1 && currentPosition && (
        <Polyline
          positions={[currentPosition, ...coords.slice(currentSegmentIndex + 1)]}
          pathOptions={{ color: "#1976d2", weight: 2, opacity: 0.3, dashArray: "5, 10" }}
        />
      )}

      {/* Moving Marker */}
      {currentPosition && showMovingMarker && (
        <Marker position={currentPosition} icon={divIcon} zIndexOffset={2000} pane="markerPane" />
      )}

      {/* Static Location/Feature Markers with Labels */}
      {validItems.map((item, index) => {
        const position = getCoords(item)
        if (!position) return null

        const config = item.animation_config || globalConfig || {}
        const showName = config.showName ?? true
        const showOnArrival = config.showOnArrival ?? true

        const hasArrived = index <= currentSegmentIndex + (segmentProgress > 0.9 ? 1 : 0)
        const shouldShowLabel = showName || (showOnArrival && hasArrived)

        const isLocation = "city" in item
        const label = isLocation ? item.city : (item as TripFeature).properties?.name || "Unknown"

        let markerIcon = locationIcon
        if (!isLocation) {
          markerIcon = locationIcon
        }

        return (
          <Marker key={index} position={position} icon={markerIcon} zIndexOffset={500}>
            {shouldShowLabel && (
              <LeafletTooltip permanent direction="top" offset={[0, -30]}>
                {label}
              </LeafletTooltip>
            )}
          </Marker>
        )
      })}
    </>
  )
}
