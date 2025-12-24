import L from "leaflet"
import { useEffect, useState } from "react"
import { GeoJSON } from "react-leaflet"

import { getIconForFeature } from "./MapUtils"

interface GeoJSONLayerProps {
  url: string
  onContextMenu?: (feature: any) => void
}

export const GeoJSONLayer = ({ url, onContextMenu }: GeoJSONLayerProps) => {
  const [data, setData] = useState<any>(null)

  useEffect(() => {
    fetch(url)
      .then((res) => res.json())
      .then((json) => setData(json))
      .catch((err) => console.error("Failed to load geojson", err))
  }, [url])

  if (!data) return null

  return (
    <GeoJSON
      data={data}
      style={(feature: any) => ({
        color: feature.properties?.color || "#1976d2",
        weight: feature.properties?.weight || 3,
        opacity: feature.properties?.opacity || 0.6,
      })}
      pointToLayer={(feature, latlng) => {
        return L.marker(latlng, {
          icon: getIconForFeature(feature, feature.properties?.style),
        })
      }}
      onEachFeature={(feature, layer) => {
        if (onContextMenu) {
          layer.on("contextmenu", (e) => {
            L.DomEvent.stopPropagation(e)
            onContextMenu(feature)
          })
        }
        if (feature.properties?.name) {
          layer.bindPopup(feature.properties.name)
        }
      }}
    />
  )
}
