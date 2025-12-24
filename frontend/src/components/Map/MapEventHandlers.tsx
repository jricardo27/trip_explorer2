import { useEffect } from "react"
import { useMap, useMapEvents } from "react-leaflet"

interface MapFlyHandlerProps {
  location?: { lat: number; lng: number } | null
}

export const MapFlyHandler = ({ location }: MapFlyHandlerProps) => {
  const map = useMap()
  useEffect(() => {
    if (location) {
      map.flyTo([location.lat, location.lng], 14, { duration: 1.5 })
    }
  }, [location, map])
  return null
}

interface MapStateManagerProps {
  onMapMove: (center: [number, number], zoom: number) => void
  onContextMenu?: (latLng: { lat: number; lng: number }) => void
}

export const MapStateManager = ({ onMapMove, onContextMenu }: MapStateManagerProps) => {
  const map = useMapEvents({
    moveend: () => {
      const center = map.getCenter()
      onMapMove([center.lat, center.lng], map.getZoom())
    },
    zoomend: () => {
      const center = map.getCenter()
      onMapMove([center.lat, center.lng], map.getZoom())
    },
    contextmenu: (e) => {
      if (onContextMenu) {
        onContextMenu(e.latlng)
      }
    },
  })
  return null
}
