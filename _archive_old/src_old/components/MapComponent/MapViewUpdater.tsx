import React, { useEffect } from "react"
import { useMap } from "react-leaflet"

import { TCoordinate } from "../../data/types"

interface IMapViewUpdaterProps {
  center: TCoordinate | [number, number]
  zoom: number
}

const MapViewUpdater = ({ center, zoom }: IMapViewUpdaterProps): React.ReactNode => {
  const map = useMap()

  // Update the map view when center or zoom changes
  useEffect(() => {
    if (center && zoom) {
      map.setView(center, zoom)
    }
  }, [center, zoom, map])

  return null
}

export default MapViewUpdater
