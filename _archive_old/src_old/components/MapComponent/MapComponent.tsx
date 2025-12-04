import L from "leaflet"
import React, { useCallback, useEffect, useState } from "react"
import { LayersControl, MapContainer, TileLayer } from "react-leaflet"

import "leaflet/dist/leaflet.css"
import { useThemeMode } from "../../contexts/useThemeMode"
import { TCoordinate } from "../../data/types"
import { TLayerOverlay } from "../../data/types/TLayerOverlay"

import { BaseLayers } from "./BaseLayers"
import MapEvents from "./MapEvents"
import MapStateManager from "./MapStateManager"
import MapViewUpdater from "./MapViewUpdater"
import ZoomLevelDisplay from "./ZoomLevelDisplay"

// Theme-aware default tile layers
const LIGHT_TILES = {
  url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
}

const DARK_TILES = {
  url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors ' +
    '&copy; <a href="https://carto.com/attributions">CARTO</a>',
}

export interface MapComponentProps {
  children?: React.ReactNode
  center: TCoordinate | [number, number]
  overlays?: TLayerOverlay[]
  contextMenuHandler?: (event: L.LeafletMouseEvent) => void
  onBoundsChange?: (bounds: L.LatLngBounds) => void
  externalOverlayVisibility?: Record<string, boolean>
  onOverlayVisibilityChange?: (newVisibility: Record<string, boolean>) => void
}

const MapComponent = ({
  children,
  center,
  overlays,
  contextMenuHandler,
  onBoundsChange,
  externalOverlayVisibility,
  onOverlayVisibilityChange,
}: MapComponentProps): React.ReactElement => {
  const { mode } = useThemeMode()
  const tiles = mode === "light" ? LIGHT_TILES : DARK_TILES

  const [mapState, setMapState] = useState(() => {
    const saved = localStorage.getItem("mapState")

    if (saved) {
      const parsed = JSON.parse(saved)
      return {
        center: parsed.center,
        zoom: parsed.zoom,
      }
    }
    return {
      center: center,
      zoom: 13,
    }
  })

  const [internalOverlayVisibility, setInternalOverlayVisibility] = useState<Record<string, boolean>>(() => {
    const savedOverlayVisibility = localStorage.getItem("overlayVisibility")
    return savedOverlayVisibility ? JSON.parse(savedOverlayVisibility) : {}
  })

  const overlayVisibility = externalOverlayVisibility ?? internalOverlayVisibility

  const [activeBaseLayer, setActiveBaseLayer] = useState<string>(() => {
    const savedBaseLayer = localStorage.getItem("activeBaseLayer")
    return savedBaseLayer ?? "Esri World Street Map"
  })

  const memoizedSetOverlayVisibility = useCallback(
    (newVisibilityOrUpdater: React.SetStateAction<Record<string, boolean>>) => {
      if (onOverlayVisibilityChange) {
        // Handle functional update if necessary, though MapEvents usually passes a function
        // We need to calculate the new state to pass it up
        // Since we can't easily access the 'current' state inside the updater if it's external without a ref or dependency,
        // we rely on the fact that we have 'overlayVisibility' in scope.

        let newVisibility: Record<string, boolean>
        if (typeof newVisibilityOrUpdater === "function") {
          newVisibility = newVisibilityOrUpdater(overlayVisibility)
        } else {
          newVisibility = newVisibilityOrUpdater
        }
        onOverlayVisibilityChange(newVisibility)
      } else {
        setInternalOverlayVisibility(newVisibilityOrUpdater)
      }
    },
    [onOverlayVisibilityChange, overlayVisibility],
  )

  const memoizedSetActiveBaseLayer = useCallback((newBaseLayer: React.SetStateAction<string>) => {
    setActiveBaseLayer(newBaseLayer)
  }, [])

  useEffect(() => {
    if (!externalOverlayVisibility) {
      localStorage.setItem("overlayVisibility", JSON.stringify(internalOverlayVisibility))
    }
  }, [internalOverlayVisibility, externalOverlayVisibility])

  useEffect(() => {
    localStorage.setItem("activeBaseLayer", activeBaseLayer)
  }, [activeBaseLayer])

  const handleMapMove = useCallback(
    (center: [number, number], zoom: number, bounds: L.LatLngBounds) => {
      setMapState({ center, zoom })
      onBoundsChange?.(bounds)
    },
    [onBoundsChange],
  )

  return (
    <>
      <MapContainer
        center={mapState.center}
        zoom={mapState.zoom}
        scrollWheelZoom={true}
        style={{ height: "100vh", width: "100%" }}
      >
        <MapEvents
          setOverlayVisibility={memoizedSetOverlayVisibility}
          setActiveBaseLayer={memoizedSetActiveBaseLayer}
          contextMenuHandler={contextMenuHandler}
        />
        <MapStateManager onMapMove={handleMapMove} />
        <MapViewUpdater center={mapState.center} zoom={mapState.zoom} />
        <ZoomLevelDisplay />
        <TileLayer key={mode} attribution={tiles.attribution} url={tiles.url} maxZoom={20} />
        <LayersControl position="topright">
          {Object.entries(BaseLayers).map(([key, layer]) => (
            <LayersControl.BaseLayer key={key} name={layer.name} checked={activeBaseLayer === layer.name}>
              <TileLayer attribution={layer.attribution} url={layer.url} maxZoom={layer.maxZoom || 20} />
            </LayersControl.BaseLayer>
          ))}

          {overlays &&
            overlays.map((layerProps) => (
              <LayersControl.Overlay
                key={layerProps.name}
                name={layerProps.name}
                checked={
                  overlayVisibility[layerProps.name] !== undefined
                    ? overlayVisibility[layerProps.name]
                    : layerProps.checked !== undefined
                      ? layerProps.checked
                      : false
                }
              >
                {layerProps.children}
              </LayersControl.Overlay>
            ))}
        </LayersControl>
        {children}
      </MapContainer>
    </>
  )
}

export default MapComponent
