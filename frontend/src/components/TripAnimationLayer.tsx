import L from "leaflet"
import React, { useEffect, useState, useRef, useMemo, useCallback } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { MdLocationCity } from "react-icons/md"
import { Marker, Polyline, useMap, Tooltip as LeafletTooltip } from "react-leaflet"

import { getTransportIconComponent, getTravelIcon } from "../constants/transportModes"
import type { Activity } from "../types"
import { getGreatCirclePoint, getGreatCirclePath } from "../utils/geodesicUtils"

interface AnimationConfig {
  speed?: number
  pauseOnArrival?: number
  zoomLevel?: number
  zoomPadding?: number
  baseSpeedMultiplier?: number
  slowdownStartThreshold?: number
  slowdownIntensity?: number
  minSegmentDuration?: number
  maxSegmentDuration?: number
  defaultTravelIcon?: string
  showName?: boolean
  showOnArrival?: boolean
}

interface TripAnimationLayerProps {
  activities: Activity[]
  isPlaying: boolean
  onProgressUpdate: (progress: number) => void
  seekProgress: number | null // 0-100
  onAnimationComplete: () => void
  config?: AnimationConfig
}

// Zoom phases
const ZoomPhase = {
  INITIAL: 1,
  ZOOM_OUT_TO_BOTH: 2,
  MAINTAIN: 3,
  ZOOM_TO_DEST: 4,
} as const

type ZoomPhaseType = (typeof ZoomPhase)[keyof typeof ZoomPhase]

// Helper to get coordinates from activity
const getCoords = (activity: Activity): [number, number] | null => {
  if (activity.latitude && activity.longitude) {
    return [Number(activity.latitude), Number(activity.longitude)]
  }
  return null
}

// Helper to calculate distance between two points
const getDistance = (p1: [number, number], p2: [number, number]) => {
  return L.latLng(p1).distanceTo(L.latLng(p2))
}

export const TripAnimationLayer: React.FC<TripAnimationLayerProps> = ({
  activities,
  isPlaying,
  onProgressUpdate,
  seekProgress,
  onAnimationComplete,
  config,
}) => {
  const map = useMap()

  const [currentSegmentIndex, setCurrentSegmentIndex] = useState(0)
  const [segmentProgress, setSegmentProgress] = useState(0) // 0 to 1
  const [isPaused, setIsPaused] = useState(false)
  const [pauseStartTime, setPauseStartTime] = useState<number | null>(null)
  const [zoomPhase, setZoomPhase] = useState<ZoomPhaseType>(ZoomPhase.INITIAL)
  const [initialZoomComplete, setInitialZoomComplete] = useState(false)

  const requestRef = useRef<number | null>(null)
  const previousTimeRef = useRef<number | undefined>(undefined)

  // Filter activities with valid coordinates
  const validActivities = useMemo(() => activities.filter((a) => getCoords(a) !== null), [activities])
  const coords = useMemo(() => validActivities.map((a) => getCoords(a)!), [validActivities])

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

  // Handle zoom based on phase
  useEffect(() => {
    if (!isPlaying || coords.length < 2 || currentSegmentIndex >= coords.length - 1) return

    const origin = coords[currentSegmentIndex]
    const destination = coords[currentSegmentIndex + 1]

    const zoomLevel = config?.zoomLevel ?? 14
    const zoomPadding = config?.zoomPadding ?? 100

    switch (zoomPhase) {
      case ZoomPhase.INITIAL:
      case ZoomPhase.ZOOM_OUT_TO_BOTH: {
        const bounds = L.latLngBounds([origin, destination])
        map.fitBounds(bounds, { padding: [zoomPadding, zoomPadding], animate: true, duration: 2 })
        break
      }
      case ZoomPhase.MAINTAIN: {
        // No zoom change
        break
      }
      case ZoomPhase.ZOOM_TO_DEST: {
        if (segmentProgress >= 0.66 && segmentProgress < 0.67) {
          map.flyTo(destination, zoomLevel, { animate: true, duration: 2 })
        }
        break
      }
    }
  }, [zoomPhase, currentSegmentIndex, coords, map, isPlaying, segmentProgress, config])

  // Animation Loop
  const animate = useCallback(
    (time: number) => {
      if (previousTimeRef.current !== undefined) {
        const deltaTime = time - previousTimeRef.current

        // Handle pause on arrival
        if (isPaused && pauseStartTime !== null) {
          const pauseDuration = (config?.pauseOnArrival ?? 3) * 1000

          if (time - pauseStartTime >= pauseDuration) {
            setIsPaused(false)
            setPauseStartTime(null)

            if (currentSegmentIndex < coords.length - 2) {
              setCurrentSegmentIndex((prev) => prev + 1)
              setSegmentProgress(0)
              setZoomPhase(ZoomPhase.ZOOM_OUT_TO_BOTH)
            } else {
              onAnimationComplete()
              return
            }
          }
        }

        // Handle movement
        if (!isPaused && initialZoomComplete && currentSegmentIndex < coords.length - 1) {
          const baseSpeedMultiplier = config?.baseSpeedMultiplier ?? 500000
          const slowdownStartThreshold = config?.slowdownStartThreshold ?? 0.8
          const slowdownIntensity = config?.slowdownIntensity ?? 0.7
          const minSegmentDuration = config?.minSegmentDuration ?? 3
          const maxSegmentDuration = config?.maxSegmentDuration ?? 10
          const itemSpeed = config?.speed ?? 1

          const effectiveSpeed = baseSpeedMultiplier * itemSpeed
          const p1 = coords[currentSegmentIndex]
          const p2 = coords[currentSegmentIndex + 1]
          const segmentDist = getDistance(p1, p2)

          if (segmentDist > 0) {
            const maxSpeedForMinTime = segmentDist / minSegmentDuration
            const minSpeedForMaxTime = segmentDist / maxSegmentDuration

            let currentSpeed = Math.min(effectiveSpeed, maxSpeedForMinTime)

            // Apply slowdown
            if (segmentProgress > slowdownStartThreshold) {
              const slowdownRange = 1 - slowdownStartThreshold
              const slowdownFactor =
                1 - ((segmentProgress - slowdownStartThreshold) / slowdownRange) * slowdownIntensity
              currentSpeed *= slowdownFactor
            }

            const constrainedSpeed = Math.max(currentSpeed, minSpeedForMaxTime)
            const actualDistanceToTravel = (constrainedSpeed * deltaTime) / 1000
            const progressIncrement = actualDistanceToTravel / segmentDist
            const newProgress = segmentProgress + progressIncrement

            // Phase transitions
            if (newProgress < 0.33) {
              if (zoomPhase === ZoomPhase.INITIAL) {
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
              setZoomPhase(ZoomPhase.INITIAL)
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
      config,
      initialZoomComplete,
      isPaused,
      onAnimationComplete,
      pauseStartTime,
      segmentProgress,
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
  }, [isPlaying, coords, animate])

  // Calculate current position
  const currentPosition = useMemo(() => {
    if (coords.length < 2) return null
    if (currentSegmentIndex >= coords.length - 1) return coords[coords.length - 1]

    const p1 = coords[currentSegmentIndex]
    const p2 = coords[currentSegmentIndex + 1]

    return getGreatCirclePoint(p1, p2, segmentProgress)
  }, [coords, currentSegmentIndex, segmentProgress])

  // Generate path segments
  const pathSegments = useMemo(() => {
    if (coords.length < 2) return []
    const segments: [number, number][][] = []

    for (let i = 0; i < coords.length - 1; i++) {
      segments.push(getGreatCirclePath(coords[i], coords[i + 1], 20))
    }
    return segments
  }, [coords])

  // Update global progress
  useEffect(() => {
    if (coords.length < 2) return

    let distanceCovered = 0
    for (let i = 0; i < currentSegmentIndex; i++) {
      distanceCovered += getDistance(coords[i], coords[i + 1])
    }

    if (currentSegmentIndex < coords.length - 1) {
      const currentSegDist = getDistance(coords[currentSegmentIndex], coords[currentSegmentIndex + 1])
      distanceCovered += currentSegDist * segmentProgress
    }

    const totalProgress = totalDistance > 0 ? (distanceCovered / totalDistance) * 100 : 0
    onProgressUpdate(totalProgress)
  }, [currentSegmentIndex, segmentProgress, coords, totalDistance, onProgressUpdate])

  // Initialize zoom
  useEffect(() => {
    if (isPlaying && currentSegmentIndex === 0 && segmentProgress === 0 && coords.length > 1) {
      setInitialZoomComplete(false)
      setZoomPhase(ZoomPhase.ZOOM_OUT_TO_BOTH)
      setTimeout(() => {
        setInitialZoomComplete(true)
      }, 2000)
    } else if (!isPlaying && currentSegmentIndex === 0 && segmentProgress === 0) {
      setInitialZoomComplete(false)
    }
  }, [isPlaying, currentSegmentIndex, segmentProgress, coords])

  // Determine moving icon
  const movingIcon = useMemo(() => {
    const defaultIcon = config?.defaultTravelIcon || "person"

    if (currentSegmentIndex < validActivities.length - 1) {
      const nextActivity = validActivities[currentSegmentIndex + 1]
      // Check for transport mode in activity (if available)
      const mode = (nextActivity as any).transportMode
      const IconComp = getTransportIconComponent(mode)
      if (IconComp) return <IconComp />
    }

    const TravelIcon = getTravelIcon(defaultIcon)
    return <TravelIcon />
  }, [currentSegmentIndex, validActivities, config])

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

  // Location marker icon
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

  const showMovingMarker =
    !isPaused && initialZoomComplete && (isPlaying || currentSegmentIndex > 0 || segmentProgress > 0)

  return (
    <>
      {/* Animated Path */}
      {currentPosition && coords.length > 0 && initialZoomComplete && (
        <Polyline
          positions={[
            ...pathSegments.slice(0, currentSegmentIndex).flat(),
            ...getGreatCirclePath(coords[currentSegmentIndex], currentPosition, Math.ceil(20 * segmentProgress)),
            currentPosition,
          ]}
          pathOptions={{ color: "#1976d2", weight: 4, opacity: 0.8 }}
        />
      )}

      {/* Remaining path preview */}
      {coords.length > currentSegmentIndex + 1 && currentPosition && (
        <Polyline
          positions={[
            currentPosition,
            ...getGreatCirclePath(
              currentPosition,
              coords[currentSegmentIndex + 1],
              Math.ceil(20 * (1 - segmentProgress)),
            ),
            ...pathSegments.slice(currentSegmentIndex + 1).flat(),
          ]}
          pathOptions={{ color: "#1976d2", weight: 2, opacity: 0.3, dashArray: "5, 10" }}
        />
      )}

      {/* Moving Marker */}
      {currentPosition && showMovingMarker && <Marker position={currentPosition} icon={divIcon} zIndexOffset={2000} />}

      {/* Static Location Markers */}
      {validActivities.map((activity, index) => {
        const position = getCoords(activity)
        if (!position) return null

        const hasArrived = index <= currentSegmentIndex + (segmentProgress > 0.9 ? 1 : 0)
        const showName = config?.showName ?? true
        const showOnArrival = config?.showOnArrival ?? true
        const shouldShowLabel = showName || (showOnArrival && hasArrived)

        return (
          <Marker key={activity.id} position={position} icon={locationIcon} zIndexOffset={500}>
            {shouldShowLabel && (
              <LeafletTooltip permanent direction="top" offset={[0, -30]}>
                {activity.name}
              </LeafletTooltip>
            )}
          </Marker>
        )
      })}
    </>
  )
}
