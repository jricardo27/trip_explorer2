import L from "leaflet"
import React, { useCallback, useEffect, useState } from "react"
import { LayersControl, MapContainer, TileLayer } from "react-leaflet"

import "leaflet/dist/leaflet.css"
import { TCoordinate } from "../../data/types"
import { TLayerOverlay } from "../../data/types/TLayerOverlay"

import { BaseLayers } from "./BaseLayers"
import MapEvents from "./MapEvents"
import MapStateManager from "./MapStateManager"
import MapViewUpdater from "./MapViewUpdater"
import ZoomLevelDisplay from "./ZoomLevelDisplay"

export interface MapComponentProps {
  children?: React.ReactNode
  center: TCoordinate | [number, number]
  overlays?: TLayerOverlay[]
  contextMenuHandler?: (event: L.LeafletMouseEvent) => void
  onBoundsChange?: (bounds: L.LatLngBounds) => void
}

const MapComponent = ({
  children,
  center,
  overlays,
  contextMenuHandler,
  onBoundsChange,
}: MapComponentProps): React.ReactElement => {
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

  const [overlayVisibility, setOverlayVisibility] = useState<Record<string, boolean>>(() => {
    const savedOverlayVisibility = localStorage.getItem("overlayVisibility")
    return savedOverlayVisibility ? JSON.parse(savedOverlayVisibility) : {}
  })

  const [activeBaseLayer, setActiveBaseLayer] = useState<string>(() => {
    const savedBaseLayer = localStorage.getItem("activeBaseLayer")
    return savedBaseLayer ?? "Esri World Street Map"
  })

  const memoizedSetOverlayVisibility = useCallback((newVisibility: React.SetStateAction<Record<string, boolean>>) => {
    setOverlayVisibility(newVisibility)
  }, [])

  const memoizedSetActiveBaseLayer = useCallback((newBaseLayer: React.SetStateAction<string>) => {
    setActiveBaseLayer(newBaseLayer)
  }, [])

  useEffect(() => {
    localStorage.setItem("overlayVisibility", JSON.stringify(overlayVisibility))
  }, [overlayVisibility])

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
