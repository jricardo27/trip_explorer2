import React, { useEffect, useState } from "react"
import { useMap } from "react-leaflet"

function ZoomLevelDisplay(): React.ReactNode {
  const map = useMap()
  const [zoomLevel, setZoomLevel] = useState(map.getZoom())
  const style: React.CSSProperties = {
    background: "white",
    bottom: "10px",
    color: "black",
    left: "10px",
    padding: "5px",
    position: "absolute",
    zIndex: 400,
  }

  useEffect(() => {
    const updateZoom = () => {
      setZoomLevel(map.getZoom())
    }

    map.on("zoomend", updateZoom)

    return () => {
      map.off("zoomend", updateZoom) // Clean up event listener
    }
  }, [map])

  return (
    <div style={style}>
      Zoom:
      {zoomLevel}
    </div>
  )
}

export default ZoomLevelDisplay
