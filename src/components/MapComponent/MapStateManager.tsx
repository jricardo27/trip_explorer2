import React, { useCallback } from "react"
import { useMap, useMapEvent } from "react-leaflet"

const MapStateManager = ({ onMapMove }: { onMapMove?: (center: [number, number], zoom: number, bounds: L.LatLngBounds) => void }): React.ReactNode => {
  const map = useMap()

  const saveMapState = useCallback(() => {
    const center = map.getCenter()
    const zoom = map.getZoom()
    const bounds = map.getBounds()
    const newMapState = {
      center: [center.lat, center.lng],
      zoom,
    }
    localStorage.setItem("mapState", JSON.stringify(newMapState))
    onMapMove?.([center.lat, center.lng], zoom, bounds)
  }, [map, onMapMove])

  // Handle both drag and zoom events
  useMapEvent("dragend", saveMapState)
  useMapEvent("zoomend", saveMapState)

  // Trigger initial state save to ensure bounds are set on mount
  React.useEffect(() => {
    saveMapState()
  }, [saveMapState])

  return null
}

export default MapStateManager
