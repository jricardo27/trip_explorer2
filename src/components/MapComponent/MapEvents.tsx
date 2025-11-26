import type { Layer } from "leaflet"
import { useCallback } from "react"
import { useMapEvents } from "react-leaflet"

interface MapEventsProps {
  setOverlayVisibility: React.Dispatch<React.SetStateAction<Record<string, boolean>>>
  setActiveBaseLayer: React.Dispatch<React.SetStateAction<string>>
  contextMenuHandler?: (event: L.LeafletMouseEvent) => void
}

const MapEvents = ({ setOverlayVisibility, setActiveBaseLayer, contextMenuHandler }: MapEventsProps) => {
  const handleOverlayAdd = useCallback(
    (event: { layer: Layer; name: string }) => {
      const layerName = event.name
      setOverlayVisibility((prevVisibility) => ({
        ...prevVisibility,
        [layerName]: true,
      }))
    },
    [setOverlayVisibility],
  )

  const handleOverlayRemove = useCallback(
    (event: { layer: Layer; name: string }) => {
      const layerName = event.name
      setOverlayVisibility((prevVisibility) => ({
        ...prevVisibility,
        [layerName]: false,
      }))
    },
    [setOverlayVisibility],
  )

  const handleBaseLayerChange = useCallback(
    (event: { name: string }) => {
      setActiveBaseLayer(event.name)
    },
    [setActiveBaseLayer],
  )

  useMapEvents({
    overlayadd: handleOverlayAdd,
    overlayremove: handleOverlayRemove,
    baselayerchange: handleBaseLayerChange,
    contextmenu: contextMenuHandler,
  })
  return null
}

export default MapEvents
