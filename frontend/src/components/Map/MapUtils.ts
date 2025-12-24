import L from "leaflet"
import React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { BsFuelPump } from "react-icons/bs"
import { MdHotel, MdKayaking, MdLocalGasStation, MdWc, MdPark, MdPlace } from "react-icons/md"

export const LIGHT_TILES = {
  url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
}

export const DARK_TILES = {
  url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
}

export const getIconForFeature = (feature: any, layerStyle?: any) => {
  const type = feature.properties?.type || "marker"
  const color = layerStyle?.color || "#1976d2"

  let Icon: any = MdPlace

  if (type === "hotel" || type === "accommodation") Icon = MdHotel
  else if (type === "gas") Icon = MdLocalGasStation
  else if (type === "parking") Icon = MdPlace
  else if (type === "park") Icon = MdPark
  else if (type === "toilet") Icon = MdWc
  else if (type === "fuel") Icon = BsFuelPump
  else if (type === "kayak") Icon = MdKayaking

  const iconHtml = renderToStaticMarkup(
    React.createElement(Icon, {
      style: {
        color: color,
        fontSize: "24px",
        filter: "drop-shadow(0 0 1px rgba(0,0,0,0.5))",
      },
    }),
  )

  return L.divIcon({
    html: `<div style="display:flex;justify-content:center;align-items:center;width:30px;height:30px;">${iconHtml}</div>`,
    className: "custom-geojson-icon",
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  })
}
