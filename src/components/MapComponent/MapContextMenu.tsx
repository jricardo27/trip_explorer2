import L from "leaflet"
import React, { useCallback, useEffect, useState } from "react"
import { useMapEvents } from "react-leaflet"

import { TCoordinate, TPosition } from "../../data/types"
import ContextMenu from "../ContextMenu/ContextMenu"

interface IMapContextMenuProps {
  latlng?: L.LatLng | undefined
  children: React.ReactNode
}

const MapContextMenu = ({ ...props }: IMapContextMenuProps): React.ReactNode => {
  const [menuPosition, setMenuPosition] = useState<TPosition | null>(null)
  const [coordinates, setCoordinates] = useState<TCoordinate | null>(null)

  const map = useMapEvents({
    contextmenu: (event) => {
      event.originalEvent.preventDefault() // Prevent default context menu
      handleLatLng(event.latlng)
    },
    click: () => {
      setTimeout(() => {
        setMenuPosition(null)
      }, 100)
    },
  })

  const handleLatLng = useCallback(
    (latlng: L.LatLng) => {
      const { lat, lng } = latlng
      setCoordinates({ lat, lng })

      // Convert the click position to container coordinates
      const containerPoint = map.latLngToContainerPoint(latlng)
      setMenuPosition({ x: containerPoint.x, y: containerPoint.y })
    },
    [map],
  )

  useEffect(() => {
    if (!props.latlng) {
      setCoordinates(null)
      setMenuPosition(null)
    } else {
      handleLatLng(props.latlng)
    }
  }, [props.latlng, handleLatLng])

  const payload = coordinates ? { coordinates } : null

  return menuPosition ? (
    <ContextMenu position={menuPosition} onClose={() => setMenuPosition(null)} payload={payload}>
      {props.children}
    </ContextMenu>
  ) : null
}

export default MapContextMenu
