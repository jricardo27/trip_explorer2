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
import { Marker, Polyline, useMap, Tooltip as LeafletTooltip, Popup } from "react-leaflet"

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
  const legDurationRef = useRef<number>(2000)
  const lastProgressRef = useRef<number>(0)
  const lastUiUpdateProgressRef = useRef<number>(0)
  const lastReportedProgressRef = useRef<number>(0)
  const movingMarkerRef = useRef<L.Marker>(null)

  // Stable refs for callbacks
  const onAnimationCompleteRef = useRef(onAnimationComplete)
  const onProgressUpdateRef = useRef(onProgressUpdate)

  useEffect(() => {
    onAnimationCompleteRef.current = onAnimationComplete
    onProgressUpdateRef.current = onProgressUpdate
  }, [onAnimationComplete, onProgressUpdate])

  // Helper to update marker position imperatively
  const updateMarkerPosition = useCallback((pos: [number, number]) => {
    if (movingMarkerRef.current) {
      movingMarkerRef.current.setLatLng(pos)
    }
  }, [])

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
    if (!onProgressUpdateRef.current || coords.length < 2) return

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
      const rawProgress = (currentActivityIndex + travelProgress) / totalLegs

      // Ensure progress is monotonic (never goes backwards for the UI)
      // We allow it to go to 0 only if we are truly stopped/reset (handled by parent passing new key)
      // But if we are just moving leg to leg, it should increase.

      // However, if we loop or reset, we might want it to go back.
      // But for the reported issue, let's clamp it to be >= lastUiUpdateProgress

      // Wait, if travelProgress resets to 0 (new leg), currentActivityIndex has increased by 1.
      // (idx + 0) / N > (idx-1 + 1) / N ?  No, they are equal.
      // So transition should be smooth.

      // If user reported 43% -> 29%, it means (idx + p) dropped significantly.
      // This implies idx might have been unstable or p went to 0 BEFORE idx incremented.

      // Let's use max(rawProgress, lastUiUpdateProgressRef.current)
      // UNLESS rawProgress is very small (restart).

      let newProgress = rawProgress
      if (Math.abs(rawProgress - lastReportedProgressRef.current) < 0.2) {
        // If close, ensure monotonicity
        newProgress = Math.max(rawProgress, lastReportedProgressRef.current)
      } else {
        // Large jump (e.g. restart or seek), allow it.
      }

      overallProgress = Math.min(1, newProgress)
    }

    lastReportedProgressRef.current = overallProgress
    onProgressUpdateRef.current(overallProgress * 100)
  }, [currentActivityIndex, travelProgress, phase, coords.length])

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
      // Do NOT reset phase or progress here. This allows "Pausing".
      // The parent component (TripMap/useMapAnimation) handles "Stop/Reset"
      // by unmounting and remounting this component with a key, or we will rely on
      // explicit reset props if needed. But for now, unmounting/key change is the cleanest "Stop".
      return
    }

    if (validActivities.length < 1) {
      onAnimationCompleteRef.current()
      return
    }

    // Phase transition logic
    switch (phase) {
      case AnimationPhase.STOPPED:
        // Already handled by start effect, but as backup:
        setTimeout(() => {
          setCurrentActivityIndex(0)
          setTravelProgress(0)
          setPhase(AnimationPhase.INITIAL_OVERVIEW_PAN)
        }, 0)
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
          onAnimationCompleteRef.current()
        }, 3000)
        break

      default:
        // Other phases (PAN, TRAVEL) are handled by map/RAF effects
        break
    }

    return cleanup
  }, [phase, isPlaying, validActivities.length, coords.length, currentActivityIndex, cleanup, settings.stayDuration])

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
          setTimeout(() => setPhase(AnimationPhase.TRANSITION_TO_ACTIVITY), 0)
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
          onAnimationCompleteRef.current()
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
          setTimeout(() => setPhase(AnimationPhase.FINAL_OVERVIEW_PAN), 0)
        }
        break
      }

      case AnimationPhase.TRAVEL: {
        // Only reset progress if we are starting a NEW leg
        if (legIndexRef.current !== currentActivityIndex) {
          const p1 = coords[currentActivityIndex]
          const p2 = coords[currentActivityIndex + 1]

          if (p1 && p2) {
            const dist = map.distance(p1, p2)
            const duration = Math.max(1000, Math.min(4000, dist / (settings.speedFactor || 200)))
            console.log(
              `TripAnimationLayer: Starting new leg animation for index: ${currentActivityIndex}. Distance: ${Math.round(
                dist,
              )}m, Duration: ${Math.round(duration)}ms`,
            )
            legIndexRef.current = currentActivityIndex
            legDurationRef.current = duration
          } else {
            setTimeout(() => setPhase(AnimationPhase.FINAL_OVERVIEW_PAN), 0)
            return
          }

          travelProgressRef.current = 0
          lastProgressRef.current = 0
          setTimeout(() => setTravelProgress(0), 0)
          previousTimeRef.current = undefined

          // Initial marker position update
          if (p1) updateMarkerPosition(p1)
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

          const travelDuration = legDurationRef.current
          const progressIncrement = deltaTime / travelDuration
          const nextProgress = Math.min(1, travelProgressRef.current + progressIncrement)

          // Guard against backwards movement due to deltaTime fluctuations
          if (nextProgress > lastProgressRef.current) {
            travelProgressRef.current = nextProgress
            lastProgressRef.current = nextProgress

            // IMPERATIVE UPDATE: Update Marker Position directly
            const currentPos = getGreatCirclePoint(p1, p2, nextProgress)
            if (currentPos && movingMarkerRef.current) {
              movingMarkerRef.current.setLatLng(currentPos)
            }

            // THROTTLED STATE UPDATE: Only update React state every ~100ms or 10% change to avoid re-renders
            // This is just for the progress bar
            // Use a ref to track the last UI update to avoid dependency on state (which would be stale in the closure)
            if (
              Math.abs(nextProgress - lastUiUpdateProgressRef.current) > 0.05 ||
              nextProgress >= 1 ||
              nextProgress <= 0
            ) {
              setTravelProgress(nextProgress)
              lastUiUpdateProgressRef.current = nextProgress
            }
          }

          if (nextProgress < 1) {
            animationFrameRef.current = requestAnimationFrame(animate)
          } else {
            console.log(
              `TripAnimationLayer: Leg complete. Transitioning to next activity. Index: ${currentActivityIndex + 1}`,
            )
            // Ensure final position is set
            updateMarkerPosition(p2)
            setTravelProgress(1)

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
          onAnimationCompleteRef.current()
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
    updateMarkerPosition,
    // Note: Removed travelProgress from dependencies to avoid re-running effect on throttled updates
    // But we need to use ref for travelProgress anyway
  ])

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
    // Always render the marker when in TRAVEL phase, but position it initially
    // The animation loop will update it imperatively
    if (phase === AnimationPhase.TRAVEL) {
      // Initial position for the render cycle.
      // Note: During animation, React won't re-render this unless travelProgress state changes (throttled).
      // Using travelProgressRef or calculating it might be needed for the *initial* mount of the marker.
      // Actually, we can just use the last known good position from the throttled state or start.

      const currentPos = getGreatCirclePoint(origin, destination, travelProgress)
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

      // IMPORTANT: ref={movingMarkerRef} to allow imperative updates
      movingMarker = <Marker ref={movingMarkerRef} position={currentPos} icon={divIcon} zIndexOffset={2000} />
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
            <Popup>
              <strong>{activity.name}</strong>
              {activity.description && (
                <div>
                  <br />
                  {activity.description.substring(0, 100)}
                  {activity.description.length > 100 && "..."}
                </div>
              )}
            </Popup>
          </Marker>
        )
      })}

      {renderTravelVisuals()}
    </>
  )
}
