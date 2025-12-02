import { Box, Typography } from "@mui/material"
import React from "react"

interface MapViewProps {
  tripId: string
}

const MapView: React.FC<MapViewProps> = () => {
  // TODO: Integrate with Leaflet map component
  // Fetch activities and display on map

  return (
    <Box
      sx={{
        height: 600,
        bgcolor: "grey.100",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Typography variant="h6" color="text.secondary">
        Map View - Integrate with existing Leaflet map component
      </Typography>
    </Box>
  )
}

export default MapView
