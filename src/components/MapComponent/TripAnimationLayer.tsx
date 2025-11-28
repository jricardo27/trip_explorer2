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
  onProgressUpdate,
  seekProgress,
  onAnimationComplete,
  globalConfig,
}) => {
  const map = useMap()

  // Global speed multiplier (fixed at 1 since speed slider was removed)
  const globalSpeedMultiplier = 1
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

    const zoomLevel = globalConfig?.zoomLevel ?? 14
    const zoomPadding = globalConfig?.zoomPadding ?? 100
    const zoomToStartDuration = globalConfig?.zoomToStartDuration ?? 1
    const zoomOutToBothDuration = globalConfig?.zoomOutToBothDuration ?? 2
    // const zoomToDestDuration = globalConfig?.zoomToDestDuration ?? 3 // No longer used as fixed value
    const maintainPhaseEnd = globalConfig?.maintainPhaseEnd ?? 0.66

    switch (zoomPhase) {
      case ZoomPhase.INITIAL_ZOOM_OUT:
      case ZoomPhase.ZOOM_OUT_TO_BOTH: {
        // Show both nodes
        const bounds = L.latLngBounds([origin, destination])
        map.fitBounds(bounds, { padding: [zoomPadding, zoomPadding], animate: true, duration: zoomOutToBothDuration })
        break
      }
      case ZoomPhase.ZOOM_TO_START: {
        // Zoom to origin
        map.flyTo(origin, zoomLevel, { animate: true, duration: zoomToStartDuration })
        break
      }
      case ZoomPhase.MAINTAIN: {
        // No zoom change
        break
      }
      case ZoomPhase.ZOOM_TO_DEST: {
        // Gradually zoom to destination - only trigger once when entering this phase
        const triggerEnd = maintainPhaseEnd + 0.01
        if (segmentProgress >= maintainPhaseEnd && segmentProgress < triggerEnd) {
          // Calculate remaining time to synchronize zoom with arrival
          const p1 = coords[currentSegmentIndex]
          const p2 = coords[currentSegmentIndex + 1]
          const segmentDist = getDistance(p1, p2)

          let estimatedDuration = 3 // Fallback default

          if (segmentDist > 0) {
            const currentItem = validItems[currentSegmentIndex]
            const itemSpeed = currentItem.animation_config?.speed || globalConfig?.speed || 1
            const baseSpeedMultiplier = globalConfig?.baseSpeedMultiplier ?? 500000
            const minSegmentDuration = globalConfig?.minSegmentDuration ?? 3
            const maxSegmentDuration = globalConfig?.maxSegmentDuration ?? 10

            // Calculate speeds
            const rawSpeed = baseSpeedMultiplier * 1 * itemSpeed // globalSpeedMultiplier is 1
            const maxSpeedForMinTime = segmentDist / minSegmentDuration
            const minSpeedForMaxTime = segmentDist / maxSegmentDuration

            // 1. Clamp raw speed to max allowed speed (min duration constraint)
            const clampedBaseSpeed = Math.min(rawSpeed, maxSpeedForMinTime)

            // 2. Apply slowdown factor (simulate average slowdown effect)
            // We assume we are in or approaching slowdown phase
            // Average slowdown factor is approx (1 + (1-intensity))/2 = 1 - intensity/2
            // e.g. intensity 0.7 -> factor 0.65
            const averageSlowdownFactor = 1 - (globalConfig?.slowdownIntensity ?? 0.7) / 2

            // 3. Apply slowdown to clamped speed
            const slowedSpeed = clampedBaseSpeed * averageSlowdownFactor

            // 4. Ensure we don't violate max duration (min speed constraint)
            const finalEstimatedSpeed = Math.max(slowedSpeed, minSpeedForMaxTime)

            const remainingProgress = 1 - segmentProgress
            estimatedDuration = (segmentDist / finalEstimatedSpeed) * remainingProgress
          }

          // Ensure it's at least the configured min zoom duration (or 1s) to avoid instant snaps
          // Use the LARGER of the two to ensure we don't finish too early
          // But if estimatedDuration is very short (e.g. 0.5s), forcing 3s is bad.
          // The user problem is "zoom finishes BEFORE arrival".
          // So we want duration >= remainingTime.
          // So we should use estimatedDuration.
          // But if estimatedDuration is tiny, flyTo might look weird.
          // Let's just use estimatedDuration, but clamped to a reasonable minimum for smoothness?
          // Actually, if we are 0.5s away, we WANT it to be 0.5s.

          map.flyTo(destination, zoomLevel, { animate: true, duration: estimatedDuration })
        }
        break
      }
    }
  }, [zoomPhase, currentSegmentIndex, coords, map, isPlaying, segmentProgress, validItems, globalConfig])

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
          const itemSpeed = Number(currentItem.animation_config?.speed || globalConfig?.speed || 1) || 1

          const baseSpeedMultiplier = Number(globalConfig?.baseSpeedMultiplier) || 500000
          const slowdownStartThreshold = Number(globalConfig?.slowdownStartThreshold) || 0.8
          const slowdownIntensity = Number(globalConfig?.slowdownIntensity) || 0.7
          const minSegmentDuration = Number(globalConfig?.minSegmentDuration) || 3
          const maxSegmentDuration = Number(globalConfig?.maxSegmentDuration) || 10

          const effectiveSpeed = baseSpeedMultiplier * globalSpeedMultiplier * itemSpeed
          const p1 = coords[currentSegmentIndex]
          const p2 = coords[currentSegmentIndex + 1]
          const segmentDist = getDistance(p1, p2)

          if (segmentDist > 0) {
            // Ensure minimum animation time per segment (prevents too fast on short segments)
            const maxSpeedForMinTime = segmentDist / minSegmentDuration
            // Ensure maximum animation time per segment (prevents too slow on long segments)
            const minSpeedForMaxTime = segmentDist / maxSegmentDuration

            // 1. Clamp raw speed to max allowed speed first
            // This ensures that even if base speed is huge, we start from a reasonable baseline
            let currentSpeed = Math.min(effectiveSpeed, maxSpeedForMinTime)

            // 2. Apply slowdown to the CLAMPED speed
            // This ensures slowdown is visible even on short segments
            if (segmentProgress > slowdownStartThreshold) {
              const slowdownRange = 1 - slowdownStartThreshold
              const slowdownFactor =
                1 - ((segmentProgress - slowdownStartThreshold) / slowdownRange) * slowdownIntensity
              currentSpeed *= slowdownFactor
            }

            // 3. Ensure we don't go slower than min allowed speed (max duration constraint)
            const constrainedSpeed = Math.max(currentSpeed, minSpeedForMaxTime)

            const actualDistanceToTravel = (constrainedSpeed * deltaTime) / 1000

            const progressIncrement = actualDistanceToTravel / segmentDist
            const newProgress = segmentProgress + progressIncrement

            // Phase transitions based on progress
            const zoomOutPhaseEnd = globalConfig?.zoomOutPhaseEnd ?? 0.33
            const maintainPhaseEnd = globalConfig?.maintainPhaseEnd ?? 0.66

            if (newProgress < zoomOutPhaseEnd) {
              // First phase - zoom out to both
              if (zoomPhase === ZoomPhase.INITIAL_ZOOM_OUT) {
                setZoomPhase(ZoomPhase.ZOOM_OUT_TO_BOTH)
              }
            } else if (
              newProgress >= zoomOutPhaseEnd &&
              newProgress < maintainPhaseEnd &&
              zoomPhase !== ZoomPhase.MAINTAIN
            ) {
              setZoomPhase(ZoomPhase.MAINTAIN)
            } else if (newProgress >= maintainPhaseEnd && zoomPhase !== ZoomPhase.ZOOM_TO_DEST) {
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
      globalConfig?.baseSpeedMultiplier,
      globalConfig?.slowdownStartThreshold,
      globalConfig?.slowdownIntensity,
      globalConfig?.minSegmentDuration,
      globalConfig?.maxSegmentDuration,
      globalConfig?.zoomOutPhaseEnd,
      globalConfig?.maintainPhaseEnd,
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

    const baseSpeedMultiplier = globalConfig?.baseSpeedMultiplier ?? 500000
    const minSegmentDuration = globalConfig?.minSegmentDuration ?? 3
    const maxSegmentDuration = globalConfig?.maxSegmentDuration ?? 10

    // Calculate total expected time for all segments
    let totalExpectedTime = 0
    for (let i = 0; i < coords.length - 1; i++) {
      const segDist = getDistance(coords[i], coords[i + 1])
      const item = validItems[i]
      const itemSpeed = item.animation_config?.speed || globalConfig?.speed || 1
      const baseSpeed = baseSpeedMultiplier * globalSpeedMultiplier * itemSpeed
      const maxSpeedForMinTime = segDist / minSegmentDuration
      const minSpeedForMaxTime = segDist / maxSegmentDuration
      const actualSpeed = Math.min(baseSpeed, maxSpeedForMinTime)
      const constrainedSpeed = Math.max(actualSpeed, minSpeedForMaxTime)
      const segmentTime = segDist / constrainedSpeed
      totalExpectedTime += segmentTime
    }

    // Calculate time elapsed up to current position
    let timeElapsed = 0
    for (let i = 0; i < currentSegmentIndex; i++) {
      const segDist = getDistance(coords[i], coords[i + 1])
      const item = validItems[i]
      const itemSpeed = item.animation_config?.speed || globalConfig?.speed || 1
      const baseSpeed = baseSpeedMultiplier * globalSpeedMultiplier * itemSpeed
      const maxSpeedForMinTime = segDist / minSegmentDuration
      const minSpeedForMaxTime = segDist / maxSegmentDuration
      const actualSpeed = Math.min(baseSpeed, maxSpeedForMinTime)
      const constrainedSpeed = Math.max(actualSpeed, minSpeedForMaxTime)
      const segmentTime = segDist / constrainedSpeed
      timeElapsed += segmentTime
    }

    // Add current segment progress
    if (currentSegmentIndex < coords.length - 1) {
      const currentSegDist = getDistance(coords[currentSegmentIndex], coords[currentSegmentIndex + 1])
      const currentItem = validItems[currentSegmentIndex]
      const currentItemSpeed = currentItem.animation_config?.speed || globalConfig?.speed || 1
      const currentBaseSpeed = baseSpeedMultiplier * globalSpeedMultiplier * currentItemSpeed
      const currentMaxSpeed = currentSegDist / minSegmentDuration
      const currentMinSpeed = currentSegDist / maxSegmentDuration
      const currentActualSpeed = Math.min(currentBaseSpeed, currentMaxSpeed)
      const currentConstrainedSpeed = Math.max(currentActualSpeed, currentMinSpeed)
      const currentSegmentTime = currentSegDist / currentConstrainedSpeed
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
          const zoomToStartDuration = (globalConfig?.zoomToStartDuration ?? 1) * 1000
          const zoomOutToBothDuration = (globalConfig?.zoomOutToBothDuration ?? 2) * 1000

          setInitialZoomComplete(false)
          setZoomPhase(ZoomPhase.ZOOM_TO_START)
          // After zoom to start duration, transition to zoom out to both
          setTimeout(() => {
            setZoomPhase(ZoomPhase.ZOOM_OUT_TO_BOTH)
            // After zoom out to both duration, mark initial zoom as complete
            setTimeout(() => {
              setInitialZoomComplete(true)
            }, zoomOutToBothDuration)
          }, zoomToStartDuration)
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
  // Zoom out at end if configured
  useEffect(() => {
    if (currentSegmentIndex >= coords.length - 2 && segmentProgress >= 1) {
      const shouldZoomOutAtEnd = globalConfig?.zoomOutAtEnd ?? true
      if (shouldZoomOutAtEnd && coords.length > 1) {
        const endZoomPadding = globalConfig?.endZoomPadding ?? 50
        const endZoomDuration = globalConfig?.endZoomDuration ?? 3
        const endAnimationDelay = (globalConfig?.endAnimationDelay ?? 0) * 1000 // Convert to ms

        const timer = setTimeout(() => {
          const bounds = L.latLngBounds(coords)
          map.fitBounds(bounds, { padding: [endZoomPadding, endZoomPadding], animate: true, duration: endZoomDuration })
        }, endAnimationDelay)

        return () => clearTimeout(timer)
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

        const itemConfig = item.animation_config || {}
        // Merge configs: item config overrides global config, but fallback to global if missing
        const showName = itemConfig.showName ?? globalConfig?.showName ?? true
        const showOnArrival = itemConfig.showOnArrival ?? globalConfig?.showOnArrival ?? true
        const showNamesOnActiveOnly = itemConfig.showNamesOnActiveOnly ?? globalConfig?.showNamesOnActiveOnly ?? false

        const hasArrived = index <= currentSegmentIndex + (segmentProgress > 0.9 ? 1 : 0)
        // Active nodes include all past nodes, the current start node, AND the current destination node
        const isActive = index <= currentSegmentIndex + 1

        // Determine if label should be shown
        let shouldShowLabel = false
        if (showNamesOnActiveOnly) {
          // Only show names on nodes that are active (visited + current destination)
          shouldShowLabel = isActive && (showName || showOnArrival)
        } else {
          // Original logic: show all names (if showName=true) or only on arrival
          shouldShowLabel = showName || (showOnArrival && hasArrived)
        }

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
