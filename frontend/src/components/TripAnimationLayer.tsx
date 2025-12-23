import L from "leaflet"
import React, { useEffect, useState, useRef, useMemo, useCallback } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import {
  MdHotel,
  MdRestaurant,
  MdCameraAlt,
  MdDirectionsBus,
  MdFlight,
  MdDirectionsRun,
  MdTour,
  MdEvent,
  MdPlace,
  MdHelp,
  MdDirectionsCar,
} from "react-icons/md"
import { Marker, Polyline, useMap, Tooltip as LeafletTooltip } from "react-leaflet"

import { getTransportIconComponent } from "../constants/transportModes"
import type { Activity } from "../types"
import { getGreatCirclePoint, getGreatCirclePath } from "../utils/geodesicUtils"

// Animation phases
const AnimationPhase = {
  STOPPED: "STOPPED",
  INITIAL_OVERVIEW_PAN: "INITIAL_OVERVIEW_PAN",
  INITIAL_OVERVIEW_PAUSE: "INITIAL_OVERVIEW_PAUSE",
  TRANSITION_TO_ACTIVITY: "TRANSITION_TO_ACTIVITY",
  STAY_AT_ACTIVITY: "STAY_AT_ACTIVITY",
  DEPARTURE_PAN: "DEPARTURE_PAN",
  TRAVEL: "TRAVEL",
  FINAL_OVERVIEW_PAN: "FINAL_OVERVIEW_PAN",
  FINAL_OVERVIEW_PAUSE: "FINAL_OVERVIEW_PAUSE",
} as const

type AnimationPhaseType = (typeof AnimationPhase)[keyof typeof AnimationPhase]

interface TripAnimationLayerProps {
  activities: Activity[]
  isPlaying: boolean
  onAnimationComplete: () => void
  onProgressUpdate?: (progress: number) => void
  settings?: {
    transitionDuration: number
    stayDuration: number
    speedFactor: number
  }
}

const DEFAULT_SETTINGS = {
  transitionDuration: 1.5,
  stayDuration: 2.0,
  speedFactor: 200,
}

const ACTIVITY_TYPE_ICONS: Record<string, { icon: React.ElementType; color: string }> = {
  ACCOMMODATION: { icon: MdHotel, color: "#E91E63" },
  RESTAURANT: { icon: MdRestaurant, color: "#FF9800" },
  ATTRACTION: { icon: MdCameraAlt, color: "#9C27B0" },
  TRANSPORT: { icon: MdDirectionsBus, color: "#2196F3" },
  FLIGHT: { icon: MdFlight, color: "#03A9F4" },
  ACTIVITY: { icon: MdDirectionsRun, color: "#4CAF50" },
  TOUR: { icon: MdTour, color: "#8BC34A" },
  EVENT: { icon: MdEvent, color: "#FFC107" },
  LOCATION: { icon: MdPlace, color: "#795548" },
  CUSTOM: { icon: MdHelp, color: "#607D8B" },
}

const getActivityVisuals = (activity: Activity) => {
  const type = activity.activityType || "CUSTOM"
  return ACTIVITY_TYPE_ICONS[type] || ACTIVITY_TYPE_ICONS.CUSTOM
}

// Helper to get coordinates from an activity
const getCoords = (activity: Activity): [number, number] | null => {
  if (activity.latitude && activity.longitude) {
    return [Number(activity.latitude), Number(activity.longitude)]
  }
  return null
}

export const TripAnimationLayer: React.FC<TripAnimationLayerProps> = ({
  activities,
  isPlaying,
  onAnimationComplete,
  onProgressUpdate,
  settings = DEFAULT_SETTINGS,
}) => {
  const map = useMap()
  const [phase, setPhase] = useState<AnimationPhaseType>(AnimationPhase.STOPPED)
  const [currentActivityIndex, setCurrentActivityIndex] = useState(0)
  const [travelProgress, setTravelProgress] = useState(0)

  // Refs for managing animation loop and timers
  const animationFrameRef = useRef<number | null>(null)
  const phaseTimeoutRef = useRef<any>(null)
  const transitionTimeoutRef = useRef<any>(null)
  const previousTimeRef = useRef<number | undefined>(undefined)
  const travelProgressRef = useRef<number>(0)
  const phaseRef = useRef<AnimationPhaseType>(AnimationPhase.STOPPED)
  const legIndexRef = useRef<number>(-1)

  // Keep phaseRef in sync
  useEffect(() => {
    phaseRef.current = phase
  }, [phase])

  // Filter activities that have valid coordinates
  const { validActivities, coords } = useMemo(() => {
    const valid = activities.filter((a) => a.latitude && a.longitude)
    const points = valid.map((a) => [Number(a.latitude), Number(a.longitude)] as [number, number])
    return { validActivities: valid, coords: points }
  }, [activities])

  console.log(`TripAnimationLayer: validActivities length: ${validActivities.length}`)

  // Calculate and report overall progress
  useEffect(() => {
    if (!onProgressUpdate || coords.length < 2) return

    let overallProgress = 0
    const totalLegs = coords.length - 1

    if (phase === AnimationPhase.STOPPED) {
      overallProgress = 0
    } else if (phase === AnimationPhase.INITIAL_OVERVIEW_PAN || phase === AnimationPhase.INITIAL_OVERVIEW_PAUSE) {
      overallProgress = 0
    } else if (phase === AnimationPhase.FINAL_OVERVIEW_PAN || phase === AnimationPhase.FINAL_OVERVIEW_PAUSE) {
      overallProgress = 1
    } else {
      // Scale current index and travel progress to 0-1
      overallProgress = Math.min(1, (currentActivityIndex + travelProgress) / totalLegs)
    }

    onProgressUpdate(overallProgress * 100)
  }, [currentActivityIndex, travelProgress, phase, coords.length, onProgressUpdate])

  // Cleanup timers and animation frames
  const cleanup = useCallback(() => {
    if (phaseTimeoutRef.current) {
      clearTimeout(phaseTimeoutRef.current)
      phaseTimeoutRef.current = null
    }
    if (transitionTimeoutRef.current) {
      clearTimeout(transitionTimeoutRef.current)
      transitionTimeoutRef.current = null
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }
    previousTimeRef.current = undefined
    legIndexRef.current = -1
  }, [])

  // Main state machine effect for phase transitions and timers
  useEffect(() => {
    if (!isPlaying) {
      cleanup()
      if (phase !== AnimationPhase.STOPPED) {
        console.log(`TripAnimationLayer: Stopping animation and resetting. Current phase: ${phase}`)
        setPhase(AnimationPhase.STOPPED)
      }
      setCurrentActivityIndex(0)
      setTravelProgress(0)
      return
    }

    if (validActivities.length < 1) {
      onAnimationComplete()
      return
    }

    // Phase transition logic
    switch (phase) {
      case AnimationPhase.STOPPED:
        // Already handled by start effect, but as backup:
        setPhase(AnimationPhase.INITIAL_OVERVIEW_PAN)
        break

      case AnimationPhase.INITIAL_OVERVIEW_PAUSE:
        phaseTimeoutRef.current = setTimeout(() => {
          setPhase(AnimationPhase.TRANSITION_TO_ACTIVITY)
        }, 2000)
        break

      case AnimationPhase.STAY_AT_ACTIVITY: {
        const isLastActivity = currentActivityIndex === coords.length - 1
        const stayDuration = isLastActivity ? 3000 : settings.stayDuration * 1000
        phaseTimeoutRef.current = setTimeout(() => {
          if (isLastActivity) {
            setPhase(AnimationPhase.FINAL_OVERVIEW_PAN)
          } else {
            setPhase(AnimationPhase.DEPARTURE_PAN)
          }
        }, stayDuration)
        break
      }

      case AnimationPhase.FINAL_OVERVIEW_PAUSE:
        phaseTimeoutRef.current = setTimeout(() => {
          setPhase(AnimationPhase.STOPPED)
          onAnimationComplete()
        }, 3000)
        break

      default:
        // Other phases (PAN, TRAVEL) are handled by map/RAF effects
        break
    }

    return cleanup
  }, [
    phase,
    isPlaying,
    onAnimationComplete,
    validActivities.length,
    coords.length,
    currentActivityIndex,
    cleanup,
    settings.stayDuration,
  ])

  // Effect for Map Movements and Animation Loop
  useEffect(() => {
    if (!isPlaying) return

    const clearTransitionTimeout = () => {
      if (transitionTimeoutRef.current) {
        clearTimeout(transitionTimeoutRef.current)
        transitionTimeoutRef.current = null
      }
    }

    const onMoveEnd = (nextPhase: AnimationPhaseType) => {
      clearTransitionTimeout()
      setPhase(nextPhase)
    }

    switch (phase) {
      case AnimationPhase.INITIAL_OVERVIEW_PAN: {
        const allBounds = L.latLngBounds(coords)
        if (allBounds.isValid()) {
          map.fitBounds(allBounds, { padding: [50, 50], duration: 1.5 })
          const handleMoveEnd = () => onMoveEnd(AnimationPhase.INITIAL_OVERVIEW_PAUSE)
          map.once("moveend", handleMoveEnd)
          transitionTimeoutRef.current = setTimeout(handleMoveEnd, 1700)
        } else {
          setPhase(AnimationPhase.TRANSITION_TO_ACTIVITY)
        }
        break
      }

      case AnimationPhase.TRANSITION_TO_ACTIVITY: {
        const currentPos = coords[currentActivityIndex]
        if (currentPos) {
          map.flyTo(currentPos, 15, { duration: settings.transitionDuration })
          const handleMoveEnd = () => onMoveEnd(AnimationPhase.STAY_AT_ACTIVITY)
          map.once("moveend", handleMoveEnd)
          transitionTimeoutRef.current = setTimeout(handleMoveEnd, settings.transitionDuration * 1000 + 200)
        } else {
          onAnimationComplete()
        }
        break
      }

      case AnimationPhase.DEPARTURE_PAN: {
        const departure = coords[currentActivityIndex]
        const arrival = coords[currentActivityIndex + 1]
        if (departure && arrival) {
          const travelBounds = L.latLngBounds([departure, arrival])
          map.fitBounds(travelBounds, { padding: [70, 70], duration: 1.2 })
          const handleMoveEnd = () => onMoveEnd(AnimationPhase.TRAVEL)
          map.once("moveend", handleMoveEnd)
          transitionTimeoutRef.current = setTimeout(handleMoveEnd, 1400)
        } else {
          setPhase(AnimationPhase.FINAL_OVERVIEW_PAN)
        }
        break
      }

      case AnimationPhase.TRAVEL: {
        // Only reset progress if we are starting a NEW leg
        if (legIndexRef.current !== currentActivityIndex) {
          console.log(`TripAnimationLayer: Starting new leg animation for index: ${currentActivityIndex}`)
          legIndexRef.current = currentActivityIndex
          travelProgressRef.current = 0
          setTravelProgress(0)
          previousTimeRef.current = undefined
        }

        const animate = (time: number) => {
          if (phaseRef.current !== AnimationPhase.TRAVEL) return

          if (previousTimeRef.current === undefined) {
            previousTimeRef.current = time
            animationFrameRef.current = requestAnimationFrame(animate)
            return
          }

          const deltaTime = time - previousTimeRef.current
          previousTimeRef.current = time

          if (deltaTime > 100) {
            console.warn(`TripAnimationLayer: Large deltaTime detected: ${deltaTime}ms`)
          }

          const p1 = coords[currentActivityIndex]
          const p2 = coords[currentActivityIndex + 1]
          if (!p1 || !p2) {
            setPhase(AnimationPhase.FINAL_OVERVIEW_PAN)
            return
          }

          const dist = map.distance(p1, p2)
          const travelDuration = Math.max(1000, Math.min(4000, dist / (settings.speedFactor || 200)))
          const progressIncrement = deltaTime / travelDuration
          const nextProgress = Math.min(1, travelProgressRef.current + progressIncrement)

          travelProgressRef.current = nextProgress
          setTravelProgress(nextProgress)

          if (nextProgress < 1) {
            animationFrameRef.current = requestAnimationFrame(animate)
          } else {
            console.log(
              `TripAnimationLayer: Leg complete. Transitioning to next activity. Index: ${currentActivityIndex + 1}`,
            )
            setTimeout(() => {
              if (phaseRef.current === AnimationPhase.TRAVEL) {
                setCurrentActivityIndex((idx) => idx + 1)
                setPhase(AnimationPhase.TRANSITION_TO_ACTIVITY)
              }
            }, 100)
          }
        }

        animationFrameRef.current = requestAnimationFrame(animate)
        return () => {
          if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current)
          clearTransitionTimeout()
        }
      }

      case AnimationPhase.FINAL_OVERVIEW_PAN: {
        const allBounds = L.latLngBounds(coords)
        if (allBounds.isValid()) {
          map.fitBounds(allBounds, { padding: [50, 50], duration: 1.5 })
          const handleMoveEnd = () => onMoveEnd(AnimationPhase.FINAL_OVERVIEW_PAUSE)
          map.once("moveend", handleMoveEnd)
          transitionTimeoutRef.current = setTimeout(handleMoveEnd, 1700)
        } else {
          onAnimationComplete()
        }
        break
      }
    }

    return clearTransitionTimeout
  }, [
    phase,
    isPlaying,
    map,
    coords,
    currentActivityIndex,
    settings.transitionDuration,
    settings.speedFactor,
    onAnimationComplete,
  ])

  // Effect to start the animation from a clean state
  useEffect(() => {
    if (isPlaying && phase === AnimationPhase.STOPPED) {
      setCurrentActivityIndex(0)
      setTravelProgress(0)
      setPhase(AnimationPhase.INITIAL_OVERVIEW_PAN)
    }
  }, [isPlaying, phase])

  // --- RENDER LOGIC ---

  const renderTravelVisuals = () => {
    const showLine =
      phase === AnimationPhase.DEPARTURE_PAN ||
      phase === AnimationPhase.TRAVEL ||
      phase === AnimationPhase.STAY_AT_ACTIVITY ||
      phase === AnimationPhase.TRANSITION_TO_ACTIVITY ||
      phase === AnimationPhase.INITIAL_OVERVIEW_PAUSE // Show first leg early

    const idx = currentActivityIndex
    if (!showLine || idx >= coords.length - 1) return null

    const origin = coords[idx]
    const destination = coords[idx + 1]

    const path = getGreatCirclePath(origin, destination)
    const line = (
      <Polyline
        positions={path}
        pathOptions={{
          color: "#1976d2",
          weight: 4,
          dashArray: "10, 10",
          opacity: 0.8,
        }}
      />
    )

    let movingMarker = null
    if (phase === AnimationPhase.TRAVEL) {
      const currentPos = getGreatCirclePoint(origin, destination, travelProgress)
      if (currentPos) {
        // Use transport icon for the moving marker
        const destActivity = validActivities[idx + 1]
        const transportMode = (destActivity as any).transportMode
        const TransportIcon = getTransportIconComponent(transportMode) || MdDirectionsCar
        const { color } = getActivityVisuals(destActivity)

        const iconHtml = renderToStaticMarkup(
          <div
            style={{
              color: color,
              fontSize: "24px",
              background: "white",
              borderRadius: "50%",
              padding: "4px",
              boxShadow: "0 2px 5px rgba(0,0,0,0.3)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: `2px solid ${color}`,
            }}
          >
            <TransportIcon />
          </div>,
        )
        const divIcon = L.divIcon({
          html: iconHtml,
          className: "trip-animation-icon",
          iconSize: [36, 36],
          iconAnchor: [18, 18],
        })
        movingMarker = <Marker position={currentPos} icon={divIcon} zIndexOffset={2000} />
      }
    }

    return (
      <>
        {line}
        {movingMarker}
      </>
    )
  }

  return (
    <>
      {/* All activity markers */}
      {validActivities.map((activity, index) => {
        const position = getCoords(activity)
        if (!position) return null

        const isCurrent = index === currentActivityIndex
        const isNext = index === currentActivityIndex + 1

        // Tooltip logic
        let showTooltip = false
        if (phase === AnimationPhase.TRANSITION_TO_ACTIVITY || phase === AnimationPhase.STAY_AT_ACTIVITY) {
          if (isCurrent) showTooltip = true
        } else if (phase === AnimationPhase.DEPARTURE_PAN || phase === AnimationPhase.TRAVEL) {
          if (isCurrent || isNext) showTooltip = true
        }

        const { icon: IconComp, color } = getActivityVisuals(activity)
        const markerIcon = L.divIcon({
          html: renderToStaticMarkup(
            <div
              style={{
                color: color,
                fontSize: "20px",
                background: "white",
                borderRadius: "50%",
                padding: "6px",
                boxShadow: "0 2px 4px rgba(0,0,0,0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: `2px solid ${color}`,
                transform: isCurrent ? "scale(1.2)" : "scale(1)",
                transition: "transform 0.3s",
              }}
            >
              <IconComp />
            </div>,
          ),
          className: "location-icon",
          iconSize: [36, 36],
          iconAnchor: [18, 18],
        })

        return (
          <Marker key={activity.id} position={position} icon={markerIcon} zIndexOffset={isCurrent ? 1000 : 500}>
            {showTooltip && (
              <LeafletTooltip permanent direction="top" offset={[0, -18]}>
                <strong>{activity.name}</strong>
              </LeafletTooltip>
            )}
          </Marker>
        )
      })}

      {renderTravelVisuals()}
    </>
  )
}
