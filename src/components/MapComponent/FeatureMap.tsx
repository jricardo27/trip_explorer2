import { useMediaQuery, useTheme, ToggleButton, ToggleButtonGroup, Paper, Box } from "@mui/material"
import L, { PopupOptions } from "leaflet"
import React, { useMemo, useCallback, useEffect, useState, useContext } from "react"
import { MdAssignmentAdd } from "react-icons/md"
import { useMap } from "react-leaflet"
import { toast } from "react-toastify"

import MapComponent, { MapComponentProps } from "../../components/MapComponent/MapComponent"
import SavedFeaturesDrawer from "../../components/SavedFeaturesDrawer/SavedFeaturesDrawer"
import SavedFeaturesContext, { DEFAULT_CATEGORY } from "../../contexts/SavedFeaturesContext"
import { useTripContext, Trip } from "../../contexts/TripContext"
import { GeoJsonCollection, GeoJsonFeature } from "../../data/types"
import { TLayerOverlay } from "../../data/types/TLayerOverlay"
import { TTabMapping } from "../../data/types/TTabMapping"
import useGeoJsonMarkers from "../../hooks/useGeoJsonMarkers"
import styles from "../PopupContent/PopupContent.module.css"
import { iPopupContainerProps } from "../PopupContent/PopupContent.tsx"
import StyledGeoJson, { contextMenuHandlerProps } from "../StyledGeoJson/StyledGeoJson"

import FeatureMapContextMenu from "./FeatureMapContextMenu"
import TripRouteLayer from "./TripRouteLayer"

interface FeatureMapProps extends MapComponentProps {
  geoJsonOverlaySources: Record<string, TTabMapping>
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

export const FeatureMap = ({
  geoJsonOverlaySources,
  drawerOpen,
  closeDrawer,
  isPinned,
  onTogglePin,
  ...mapProps
}: FeatureMapProps): React.ReactNode => {
  const { addFeature, savedFeatures } = useContext(SavedFeaturesContext)!
  const { trips, currentTrip, dayLocations } = useTripContext()

  const [mapInstance, setMapInstance] = useState<L.Map | null>(null)
  const [bounds, setBounds] = useState<L.LatLngBounds | null>(null)
  const [contextMenuPosition, setContextMenuPosition] = useState<L.LatLng | null>(null)
  const [selectedFeature, setSelectedFeature] = useState<GeoJsonFeature | null>(null)
  const [fixedOverlays, setFixedOverlays] = useState<TLayerOverlay[]>([])
  const [dynamicOverlays, setDynamicOverlays] = useState<TLayerOverlay[]>([])
  const overlayFilePaths = useMemo(() => Object.keys(geoJsonOverlaySources), [geoJsonOverlaySources])
  const overlayMarkers = useGeoJsonMarkers(overlayFilePaths, bounds)

  const theme = useTheme()
  const isXs = useMediaQuery(theme.breakpoints.down("sm"))
  const isSm = useMediaQuery(theme.breakpoints.between("sm", "md"))
  const isMd = useMediaQuery(theme.breakpoints.between("md", "lg"))
  const [popupProps, setPopupProps] = useState<PopupOptions>({})
  const [popupContainerProps, setPopupContainerProps] = useState<iPopupContainerProps>({})

  const [filterMode, setFilterMode] = useState<"all" | "trip" | "past" | "future">("all")

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
        if (!isPinned && isXs) {
          closeDrawer()
        }
      }
    },
    [mapInstance, isPinned, isXs, closeDrawer],
  )

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
    setContextMenuPosition(event.latlng)
    setSelectedFeature(feature)
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

    if (!overlayMarkers.loading && !overlayMarkers.error) {
      setFixedOverlays(
        Object.entries(geoJsonOverlaySources).map(([filename, tabMapping]): TLayerOverlay => {
          const data = overlayMarkers[filename]
          const layerName = data?.properties?.style.layerName

          return {
            name: layerName,
            children: (
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
            ),
          }
        }),
      )
    }
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
    setDynamicOverlays(
      Object.entries(savedFeatures).map(([category, features]): TLayerOverlay => {
        const filteredFeatures = features.filter((feature) => {
          if (filterMode === "all") return true

          const dayId = feature.properties?.trip_day_id
          // If filtering by specific criteria, hide unassigned features
          if (!dayId) return false

          if (filterMode === "trip") {
            return currentTrip?.days?.some((d) => d.id === dayId) ?? false
          }

          const trip = dayIdToTripMap.get(dayId)
          if (!trip) return false

          const today = new Date().toISOString().split("T")[0]
          if (filterMode === "past") {
            return trip.end_date < today
          }
          if (filterMode === "future") {
            return trip.start_date > today
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
  ])

  return (
    <>
      <MapComponent
        overlays={[...fixedOverlays, ...dynamicOverlays]}
        contextMenuHandler={onMapContextMenuHandler}
        onBoundsChange={setBounds}
        {...mapProps}
      >
        <MapCapture onMapReady={setMapInstance} />
        <FeatureMapContextMenu selectedFeature={selectedFeature} menuLatLng={contextMenuPosition} />
        <TripRouteLayer currentTrip={currentTrip} dayLocations={dayLocations} />
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
      <SavedFeaturesDrawer
        drawerOpen={drawerOpen}
        onClose={closeDrawer}
        isPinned={!!isPinned}
        onTogglePin={onTogglePin || (() => {})}
        onFlyTo={handleFlyTo}
      />
    </>
  )
}
