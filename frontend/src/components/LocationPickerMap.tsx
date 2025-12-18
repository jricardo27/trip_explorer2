import "leaflet/dist/leaflet.css"
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Typography } from "@mui/material"
import L from "leaflet"
import markerIcon from "leaflet/dist/images/marker-icon.png"
import markerShadow from "leaflet/dist/images/marker-shadow.png"
import { useState, useEffect } from "react"
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from "react-leaflet"

const DefaultIcon = L.icon({
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
})

L.Marker.prototype.options.icon = DefaultIcon

interface LocationPickerMapProps {
  open: boolean
  onClose: () => void
  onSelect: (lat: number, lng: number) => void
  initialLat?: number
  initialLng?: number
}

const MapEventsHandler = ({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) => {
  useMapEvents({
    click: (e) => {
      onMapClick(e.latlng.lat, e.latlng.lng)
    },
  })
  return null
}

const MapViewHandler = ({ lat, lng }: { lat: number; lng: number }) => {
  const map = useMap()
  useEffect(() => {
    if (lat && lng) {
      map.setView([lat, lng])
    }
  }, [lat, lng, map])
  return null
}

const LocationPickerMap = ({ open, onClose, onSelect, initialLat, initialLng }: LocationPickerMapProps) => {
  const [position, setPosition] = useState<[number, number] | null>(
    initialLat && initialLng ? [initialLat, initialLng] : null,
  )

  const defaultCenter: [number, number] = [-25.2744, 133.7751] // Australia center

  const handleConfirm = () => {
    if (position) {
      onSelect(position[0], position[1])
      onClose()
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Select Location</DialogTitle>
      <DialogContent sx={{ p: 0, height: 500, display: "flex", flexDirection: "column" }}>
        <Box sx={{ flexGrow: 1, position: "relative" }}>
          <MapContainer
            center={position || defaultCenter}
            zoom={position ? 13 : 4}
            style={{ height: "100%", width: "100%" }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapEventsHandler onMapClick={(lat, lng) => setPosition([lat, lng])} />
            {position && <Marker position={position} />}
            {position && <MapViewHandler lat={position[0]} lng={position[1]} />}
          </MapContainer>
        </Box>
        <Box sx={{ p: 1, textAlign: "center", bgcolor: "background.paper" }}>
          <Typography variant="caption" color="text.secondary">
            {position
              ? `Selected: ${position[0].toFixed(6)}, ${position[1].toFixed(6)}`
              : "Click on the map to select a location"}
          </Typography>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleConfirm} variant="contained" disabled={!position}>
          Confirm Selection
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default LocationPickerMap
