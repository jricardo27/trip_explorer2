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
}) => {
  const map = useMap()
  const [phase, setPhase] = useState<AnimationPhaseType>(AnimationPhase.STOPPED)
  const [currentActivityIndex, setCurrentActivityIndex] = useState(0)
  const [travelProgress, setTravelProgress] = useState(0)

  // Refs for managing animation loop and timers
  const animationFrameRef = useRef<number | null>(null)
  const phaseTimeoutRef = useRef<any>(null)
  const previousTimeRef = useRef<number | undefined>(undefined)
  const travelProgressRef = useRef<number>(0)
  const phaseRef = useRef<AnimationPhaseType>(AnimationPhase.STOPPED)

  // Keep phaseRef in sync
  useEffect(() => {
    phaseRef.current = phase
  }, [phase])

  // Filter activities that have valid coordinates
  const validActivities = useMemo(() => activities.filter((a) => getCoords(a) !== null), [activities])
  const coords = useMemo(() => validActivities.map((a) => getCoords(a)!), [validActivities])

  // Cleanup timers and animation frames
  const cleanup = useCallback(() => {
    if (phaseTimeoutRef.current) clearTimeout(phaseTimeoutRef.current)
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current)
    previousTimeRef.current = undefined
  }, [])

  // Animation loop for the TRAVEL phase
  const animateTravel = useCallback(
    function animate(time: number) {
      if (phaseRef.current !== AnimationPhase.TRAVEL) return

      if (previousTimeRef.current === undefined) {
        previousTimeRef.current = time
        animationFrameRef.current = requestAnimationFrame(animate)
        return
      }

      const deltaTime = time - previousTimeRef.current
      previousTimeRef.current = time

      // Duration of travel based on distance
      const p1 = coords[currentActivityIndex]
      const p2 = coords[currentActivityIndex + 1]
      if (!p1 || !p2) {
        setPhase(AnimationPhase.FINAL_OVERVIEW_PAN)
        return
      }

      const dist = map.distance(p1, p2)
      // Speed check: dist / speed = time. Scale speed to be faster (e.g. 150m/ms)
      const travelDuration = Math.max(1000, Math.min(4000, dist / 200))

      const progressIncrement = deltaTime / travelDuration
      const nextProgress = Math.min(1, travelProgressRef.current + progressIncrement)
      travelProgressRef.current = nextProgress
      setTravelProgress(nextProgress)

      if (nextProgress < 1) {
        animationFrameRef.current = requestAnimationFrame(animate)
      } else {
        // Leg complete - delay transition slightly to ensure progress: 1 is rendered
        setTimeout(() => {
          if (phaseRef.current === AnimationPhase.TRAVEL) {
            setCurrentActivityIndex((prev) => prev + 1)
            setPhase(AnimationPhase.TRANSITION_TO_ACTIVITY)
          }
        }, 100)
      }
    },
    [currentActivityIndex, coords, map],
  )

  // Start travel loop specifically when phase changes to TRAVEL
  useEffect(() => {
    if (phase === AnimationPhase.TRAVEL) {
      travelProgressRef.current = 0
      setTravelProgress(0)
      previousTimeRef.current = performance.now()
      animationFrameRef.current = requestAnimationFrame(animateTravel)
      return () => {
        if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [phase, animateTravel])

  // Main state machine effect (without animateTravel dependency to avoid re-triggering loop during progress updates)
  useEffect(() => {
    // Stop and reset logic
    if (!isPlaying) {
      cleanup()
      setPhase(AnimationPhase.STOPPED)
      setCurrentActivityIndex(0)
      setTravelProgress(0)
      return
    }

    // Guard against running on empty coords
    if (coords.length < 1) {
      console.warn("TripAnimationLayer: No valid coordinates for animation.")
      onAnimationComplete()
      return
    }

    const executePhase = (currentPhase: AnimationPhaseType) => {
      // Clear any existing timers when switching phases
      if (phaseTimeoutRef.current) clearTimeout(phaseTimeoutRef.current)

      console.log(`TripAnimationLayer: Entering phase ${currentPhase} (Index: ${currentActivityIndex})`)

      switch (currentPhase) {
        case AnimationPhase.INITIAL_OVERVIEW_PAN: {
          const allBounds = L.latLngBounds(coords)
          if (allBounds.isValid()) {
            map.fitBounds(allBounds, { padding: [50, 50], duration: 1.5 })
            map.once("moveend", () => setPhase(AnimationPhase.INITIAL_OVERVIEW_PAUSE))
          } else {
            setPhase(AnimationPhase.TRANSITION_TO_ACTIVITY)
          }
          break
        }

        case AnimationPhase.INITIAL_OVERVIEW_PAUSE: {
          phaseTimeoutRef.current = setTimeout(() => {
            setPhase(AnimationPhase.TRANSITION_TO_ACTIVITY)
          }, 2000)
          break
        }

        case AnimationPhase.TRANSITION_TO_ACTIVITY: {
          const currentPos = coords[currentActivityIndex]
          if (currentPos) {
            map.flyTo(currentPos, 15, { duration: 1.5 })
            map.once("moveend", () => setPhase(AnimationPhase.STAY_AT_ACTIVITY))
          } else {
            console.error(`TripAnimationLayer: No coords at index ${currentActivityIndex}`)
            setPhase(AnimationPhase.STOPPED)
            onAnimationComplete()
          }
          break
        }

        case AnimationPhase.STAY_AT_ACTIVITY: {
          const isLastActivity = currentActivityIndex === coords.length - 1
          const stayDuration = isLastActivity ? 3000 : 2000
          phaseTimeoutRef.current = setTimeout(() => {
            if (isLastActivity) {
              setPhase(AnimationPhase.FINAL_OVERVIEW_PAN)
            } else {
              setPhase(AnimationPhase.DEPARTURE_PAN)
            }
          }, stayDuration)
          break
        }

        case AnimationPhase.DEPARTURE_PAN: {
          const departure = coords[currentActivityIndex]
          const arrival = coords[currentActivityIndex + 1]
          if (departure && arrival) {
            const travelBounds = L.latLngBounds([departure, arrival])
            map.fitBounds(travelBounds, { padding: [70, 70], duration: 1.2 })
            map.once("moveend", () => setPhase(AnimationPhase.TRAVEL))
          } else {
            setPhase(AnimationPhase.FINAL_OVERVIEW_PAN)
          }
          break
        }

        case AnimationPhase.TRAVEL:
          // Controlled by its own useEffect
          break

        case AnimationPhase.FINAL_OVERVIEW_PAN: {
          const allBounds = L.latLngBounds(coords)
          if (allBounds.isValid()) {
            map.fitBounds(allBounds, { padding: [50, 50], duration: 1.5 })
            map.once("moveend", () => setPhase(AnimationPhase.FINAL_OVERVIEW_PAUSE))
          } else {
            setPhase(AnimationPhase.STOPPED)
            onAnimationComplete()
          }
          break
        }

        case AnimationPhase.FINAL_OVERVIEW_PAUSE: {
          phaseTimeoutRef.current = setTimeout(() => {
            setPhase(AnimationPhase.STOPPED)
            onAnimationComplete()
          }, 3000)
          break
        }

        default:
          break
      }
    }

    executePhase(phase)

    return cleanup
  }, [phase, isPlaying, map, onAnimationComplete, coords, currentActivityIndex, cleanup])

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
