import { useMediaQuery, useTheme, ToggleButton, ToggleButtonGroup, Paper, Box } from "@mui/material"
import L, { PopupOptions } from "leaflet"
import React, { useMemo, useCallback, useEffect, useState, useContext } from "react"
import { MdAssignmentAdd } from "react-icons/md"
import { useMap } from "react-leaflet"
import { toast } from "react-toastify"

import MapComponent, { MapComponentProps } from "../../components/MapComponent/MapComponent"
import { useMapControl } from "../../contexts/MapControlContext"
import SavedFeaturesContext, { DEFAULT_CATEGORY } from "../../contexts/SavedFeaturesContext"
import { useTripContext, Trip, DayLocation, TripFeature } from "../../contexts/TripContext"
import { GeoJsonCollection, GeoJsonFeature } from "../../data/types"
import { TLayerOverlay } from "../../data/types/TLayerOverlay"
import { TTabMapping } from "../../data/types/TTabMapping"
import useGeoJsonMarkers from "../../hooks/useGeoJsonMarkers"
import styles from "../PopupContent/PopupContent.module.css"
import { iPopupContainerProps } from "../PopupContent/PopupContent.tsx"
import StyledGeoJson, { contextMenuHandlerProps } from "../StyledGeoJson/StyledGeoJson"

import FeatureMapContextMenu from "./FeatureMapContextMenu"
import { TripAnimationControl } from "./TripAnimationControl"
import { TripAnimationLayer } from "./TripAnimationLayer"
import { TripAnimationSettingsModal } from "./TripAnimationSettingsModal"
import TripRouteLayer from "./TripRouteLayer"

export interface OverlaySourceConfig {
  tabMapping: TTabMapping
  name: string
}

interface FeatureMapProps extends MapComponentProps {
  geoJsonOverlaySources: Record<string, TTabMapping | OverlaySourceConfig> // Support both for backward compatibility or transition
  drawerOpen: boolean
  closeDrawer: () => void
  isPinned?: boolean
  onTogglePin?: () => void
}

// Helper to capture map instance
const MapCapture = ({ onMapReady }: { onMapReady: (map: L.Map) => void }) => {
  const map = useMap()
  useEffect(() => {
    onMapReady(map)
  }, [map, onMapReady])
  return null
}

export const FeatureMap = ({ geoJsonOverlaySources, ...mapProps }: FeatureMapProps): React.ReactNode => {
  const { addFeature, savedFeatures } = useContext(SavedFeaturesContext)!
  const { trips, currentTrip, dayLocations, dayFeatures, updateTrip } = useTripContext()
  const { registerFlyTo, unregisterFlyTo } = useMapControl()

  const [mapInstance, setMapInstance] = useState<L.Map | null>(null)
  const [bounds, setBounds] = useState<L.LatLngBounds | null>(null)
  const [contextMenuPosition, setContextMenuPosition] = useState<L.LatLng | null>(null)
  const [selectedFeature, setSelectedFeature] = useState<GeoJsonFeature | null>(null)
  const [fixedOverlays, setFixedOverlays] = useState<TLayerOverlay[]>([])
  const [dynamicOverlays, setDynamicOverlays] = useState<TLayerOverlay[]>([])

  // Lifted visibility state
  const [overlayVisibility, setOverlayVisibility] = useState<Record<string, boolean>>(() => {
    const savedOverlayVisibility = localStorage.getItem("overlayVisibility")
    return savedOverlayVisibility ? JSON.parse(savedOverlayVisibility) : {}
  })

  // Save visibility to localStorage
  useEffect(() => {
    localStorage.setItem("overlayVisibility", JSON.stringify(overlayVisibility))
  }, [overlayVisibility])

  // Determine which files to fetch based on visibility
  const overlayFilePaths = useMemo(() => {
    return Object.entries(geoJsonOverlaySources)
      .filter(([, config]) => {
        // Check if it matches OverlaySourceConfig shape
        if (config && typeof config === "object" && "name" in config && "tabMapping" in config) {
          const conf = config as OverlaySourceConfig
          return overlayVisibility[conf.name] === true
        }
        return true // Fetch by default if no name provided (legacy behavior)
      })
      .map(([filename]) => filename)
  }, [geoJsonOverlaySources, overlayVisibility])

  const overlayMarkers = useGeoJsonMarkers(overlayFilePaths, bounds)

  const theme = useTheme()
  const isXs = useMediaQuery(theme.breakpoints.down("sm"))
  const isSm = useMediaQuery(theme.breakpoints.between("sm", "md"))
  const isMd = useMediaQuery(theme.breakpoints.between("md", "lg"))
  const [popupProps, setPopupProps] = useState<PopupOptions>({})
  const [popupContainerProps, setPopupContainerProps] = useState<iPopupContainerProps>({})

  const [filterMode, setFilterMode] = useState<"all" | "trip" | "past" | "future">("all")

  // Animation State
  const [isAnimationPlaying, setIsAnimationPlaying] = useState(false)
  const [animationProgress, setAnimationProgress] = useState(0)
  const [animationSeekProgress, setAnimationSeekProgress] = useState<number | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)

  const handleAnimationPlayPause = () => setIsAnimationPlaying(!isAnimationPlaying)

  const handleAnimationReset = () => {
    setIsAnimationPlaying(false)
    setAnimationProgress(0)
    setAnimationSeekProgress(0)
  }

  const handleAnimationSeek = (value: number) => {
    setAnimationSeekProgress(value)
    setAnimationProgress(value)
  }

  const handleAnimationComplete = () => setIsAnimationPlaying(false)

  // Prepare items for animation
  const animationItems = useMemo(() => {
    if (!currentTrip || !currentTrip.days) return []
    const items: (DayLocation | TripFeature)[] = []

    // Sort days by day_index to ensure correct order across multiple days
    const sortedDays = [...currentTrip.days].sort((a, b) => a.day_index - b.day_index)

    sortedDays.forEach((day) => {
      const locs = dayLocations[day.id] || []
      const ctxFeats = dayFeatures[day.id] || []

      // Sort items within each day by visit_order
      const dayItems = [...locs, ...ctxFeats].sort((a, b) => (a.visit_order || 0) - (b.visit_order || 0))
      items.push(...dayItems)
    })
    return items
  }, [currentTrip, dayLocations, dayFeatures])

  const handleFilterChange = (
    _event: React.MouseEvent<HTMLElement>,
    newMode: "all" | "trip" | "past" | "future" | null,
  ) => {
    if (newMode !== null) {
      setFilterMode(newMode)
    }
  }

  const handleFlyTo = useCallback(
    (lat: number, lng: number) => {
      if (mapInstance) {
        mapInstance.flyTo([lat, lng], 15, { duration: 1.5 })
        // If on mobile/small screen, maybe close drawer? But user might want to keep it open.
        // If pinned, definitely keep open.
        // Since drawer is now global, we might want to close it via a global action if needed,
        // but for now we just fly.
      }
    },
    [mapInstance],
  )

  // Register flyTo when mapInstance changes
  useEffect(() => {
    if (mapInstance) {
      registerFlyTo(handleFlyTo)
    }
    return () => {
      unregisterFlyTo()
    }
  }, [mapInstance, registerFlyTo, unregisterFlyTo, handleFlyTo])

  const dayIdToTripMap = useMemo(() => {
    const map = new Map<string, Trip>()
    trips.forEach((trip) => {
      trip.days?.forEach((day) => {
        map.set(day.id, trip)
      })
    })
    return map
  }, [trips])

  useEffect(() => {
    const width = isMd ? 600 : isSm ? 450 : isXs ? 275 : 900
    const height = isMd ? 450 : isSm ? 400 : isXs ? 350 : 500

    setPopupProps({
      minWidth: width,
      maxWidth: width,
      maxHeight: height,
      autoPanPadding: isMd ? L.point(100, 300) : isSm ? L.point(10, 420) : isXs ? L.point(50, 100) : L.point(160, 500),
    })

    setPopupContainerProps({
      height: height,
    })
  }, [isXs, isSm, isMd, setPopupProps, setPopupContainerProps])

  const onMapContextMenuHandler = useCallback((event: L.LeafletMouseEvent) => {
    L.DomEvent.stopPropagation(event)
    event.originalEvent.preventDefault()
    setContextMenuPosition(event.latlng)
    setSelectedFeature(null)
  }, [])

  const onFeatureContextMenuHandler = useCallback(({ event, feature }: contextMenuHandlerProps) => {
    L.DomEvent.stopPropagation(event)
    setSelectedFeature(feature)
    setContextMenuPosition(event.latlng)
  }, [])

  const onSaveFeatureToList = useCallback(
    (feature: GeoJsonFeature) => {
      addFeature(DEFAULT_CATEGORY, feature)
      toast.success("Saved")
    },
    [addFeature],
  )

  useEffect(() => {
    if (filterMode !== "all") {
      setFixedOverlays([])
      return
    }

    // Iterate over SOURCES, not just fetched markers, to ensure layers appear in control
    setFixedOverlays(
      Object.entries(geoJsonOverlaySources).map(([filename, config]): TLayerOverlay => {
        const data = overlayMarkers[filename]

        // Determine layer name: prefer config.name, fallback to data property, fallback to filename
        let layerName = "Unknown Layer"
        let tabMapping: TTabMapping

        if (config && typeof config === "object" && "name" in config && "tabMapping" in config) {
          const conf = config as OverlaySourceConfig
          layerName = conf.name
          tabMapping = conf.tabMapping
        } else {
          // Legacy support
          layerName = data?.properties?.style?.layerName || filename
          tabMapping = config as TTabMapping
        }

        // If data is not loaded yet (lazy loading), render empty group or nothing?
        // We need to render SOMETHING so the layer control exists and can be toggled.
        // If we render a LayerGroup with no children, it should work.

        return {
          name: layerName,
          children: data ? (
            <StyledGeoJson
              data={data}
              popupTabMapping={tabMapping}
              contextMenuHandler={onFeatureContextMenuHandler}
              popupProps={popupProps}
              popupContainerProps={popupContainerProps}
              popupActionButtons={[
                {
                  label: "Save",
                  startIcon: <MdAssignmentAdd />,
                  onClick: onSaveFeatureToList,
                },
              ]}
            />
          ) : (
            <React.Fragment />
          ), // Empty fragment when not loaded
        }
      }),
    )
  }, [
    geoJsonOverlaySources,
    overlayMarkers,
    onFeatureContextMenuHandler,
    popupProps,
    popupContainerProps,
    onSaveFeatureToList,
    filterMode,
  ])

  useEffect(() => {
    // Combine savedFeatures and dayFeatures
    const combinedFeatures: Record<string, GeoJsonFeature[]> = { ...savedFeatures }

    // Add trip features if available
    if (currentTrip && currentTrip.days) {
      const tripFeats: GeoJsonFeature[] = []
      currentTrip.days.forEach((day) => {
        const feats = dayFeatures[day.id] || []
        // Cast TripFeature to GeoJsonFeature (they are compatible)
        tripFeats.push(...(feats as unknown as GeoJsonFeature[]))
      })

      if (tripFeats.length > 0) {
        // Add to a specific category or merge?
        // Let's add them as a "Trip Features" category if not already present,
        // or just ensure they are included in the filtering logic.
        // Actually, the previous logic iterated over `savedFeatures`.
        // We should create a unified list for display.

        // If we want them to show up under "Trip Features" layer:
        combinedFeatures["Trip Features"] = tripFeats
      }
    }

    setDynamicOverlays(
      Object.entries(combinedFeatures).map(([category, features]): TLayerOverlay => {
        const filteredFeatures = features.filter((feature) => {
          if (filterMode === "all") return true

          const dayId = feature.properties?.trip_day_id
          // If filtering by specific criteria, hide unassigned features
          if (!dayId && category !== "Trip Features") return false // Keep generic saved features hidden if not assigned?
          // Wait, logic before was: if (!dayId) return false. This hid unassigned features in "trip" mode?
          // Let's look at previous logic:
          // if (filterMode === "all") return true
          // const dayId = feature.properties?.trip_day_id
          // if (!dayId) return false

          // If we are in "trip" mode, we definitely want to show things with dayId belonging to current trip.

          if (filterMode === "trip") {
            if (!dayId) return false
            return currentTrip?.days?.some((d) => d.id === dayId) ?? false
          }

          if (!dayId) return false // For past/future logic below

          const trip = dayIdToTripMap.get(dayId)
          if (!trip) return false

          const today = new Date().toISOString().split("T")[0]
          const tripStart = trip.start_date.split("T")[0]
          const tripEnd = trip.end_date.split("T")[0]

          if (filterMode === "past") {
            return tripEnd < today
          }
          if (filterMode === "future") {
            return tripStart > today
          }
          return true
        })

        const layerName = `- ${category}`
        const data: GeoJsonCollection = {
          type: "FeatureCollection",
          features: filteredFeatures,
          properties: {},
        }
        return {
          name: layerName,
          children: (
            <StyledGeoJson
              key={`${category}-${filterMode}`}
              data={data}
              contextMenuHandler={onFeatureContextMenuHandler}
              popupProps={popupProps}
              popupTabMappingExtra={{
                Notes: [{ key: "tripNotes", className: styles.scrollableContent, isHtml: true }],
              }}
              popupContainerProps={popupContainerProps}
            />
          ),
        }
      }),
    )
  }, [
    savedFeatures,
    onFeatureContextMenuHandler,
    popupProps,
    popupContainerProps,
    filterMode,
    currentTrip,
    dayIdToTripMap,
    dayFeatures,
  ])

  return (
    <>
      <MapComponent
        overlays={[...fixedOverlays, ...dynamicOverlays]}
        contextMenuHandler={onMapContextMenuHandler}
        onBoundsChange={setBounds}
        externalOverlayVisibility={overlayVisibility}
        onOverlayVisibilityChange={setOverlayVisibility}
        {...mapProps}
      >
        <MapCapture onMapReady={setMapInstance} />
        <FeatureMapContextMenu selectedFeature={selectedFeature} menuLatLng={contextMenuPosition} />
        <TripRouteLayer currentTrip={currentTrip} dayLocations={dayLocations} />

        {currentTrip && filterMode === "trip" && (
          <>
            <TripAnimationLayer
              items={animationItems}
              isPlaying={isAnimationPlaying}
              onProgressUpdate={setAnimationProgress}
              seekProgress={animationSeekProgress}
              onAnimationComplete={handleAnimationComplete}
              globalConfig={currentTrip.animation_config}
            />
            <TripAnimationControl
              isPlaying={isAnimationPlaying}
              onPlayPause={handleAnimationPlayPause}
              onReset={handleAnimationReset}
              progress={animationProgress}
              onSeek={handleAnimationSeek}
              onOpenSettings={() => setSettingsOpen(true)}
            />
            {currentTrip && (
              <TripAnimationSettingsModal
                open={settingsOpen}
                onClose={() => setSettingsOpen(false)}
                config={currentTrip.animation_config || {}}
                onSave={(config) => updateTrip(currentTrip.id, { animation_config: config })}
              />
            )}
          </>
        )}

        <Box
          sx={{
            position: "absolute",
            top: 10,
            left: 50,
            zIndex: 1000,
          }}
        >
          <Paper elevation={3}>
            <ToggleButtonGroup
              value={filterMode}
              exclusive
              onChange={handleFilterChange}
              aria-label="marker filter"
              size="small"
            >
              <ToggleButton value="all" aria-label="all markers">
                All
              </ToggleButton>
              <ToggleButton value="trip" aria-label="current trip" disabled={!currentTrip}>
                Trip
              </ToggleButton>
              <ToggleButton value="past" aria-label="past trips">
                Past
              </ToggleButton>
              <ToggleButton value="future" aria-label="future trips">
                Future
              </ToggleButton>
            </ToggleButtonGroup>
          </Paper>
        </Box>
      </MapComponent>
    </>
  )
}
