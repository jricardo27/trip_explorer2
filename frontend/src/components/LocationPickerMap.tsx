import "leaflet/dist/leaflet.css"
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Typography } from "@mui/material"
import L from "leaflet"
import markerIcon from "leaflet/dist/images/marker-icon.png"
import markerShadow from "leaflet/dist/images/marker-shadow.png"
import { useState, useEffect } from "react"
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from "react-leaflet"

import { useLanguageStore } from "../stores/languageStore"

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
  readOnly?: boolean
}

const MapEventsHandler = ({
  onMapClick,
  readOnly,
}: {
  onMapClick: (lat: number, lng: number) => void
  readOnly?: boolean
}) => {
  useMapEvents({
    click: (e) => {
      if (!readOnly) {
        onMapClick(e.latlng.lat, e.latlng.lng)
      }
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

const LocationPickerMap = ({
  open,
  onClose,
  onSelect,
  initialLat,
  initialLng,
  readOnly = false,
}: LocationPickerMapProps) => {
  const [position, setPosition] = useState<[number, number] | null>(
    initialLat && initialLng ? [initialLat, initialLng] : null,
  )
  const { t } = useLanguageStore()

  // Reset position when open changes or initials change
  useEffect(() => {
    if (open) {
      const newPos: [number, number] | null = initialLat && initialLng ? [initialLat, initialLng] : null
      setPosition(newPos)
    }
  }, [open, initialLat, initialLng])

  const defaultCenter: [number, number] = [-25.2744, 133.7751] // Australia center

  const handleConfirm = () => {
    if (position && !readOnly) {
      onSelect(position[0], position[1])
      onClose()
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{readOnly ? t("location") : t("selectLocation")}</DialogTitle>
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
            <MapEventsHandler onMapClick={(lat, lng) => setPosition([lat, lng])} readOnly={readOnly} />
            {position && <Marker position={position} />}
            {position && <MapViewHandler lat={position[0]} lng={position[1]} />}
          </MapContainer>
        </Box>
        <Box sx={{ p: 1, textAlign: "center", bgcolor: "background.paper" }}>
          <Typography variant="caption" color="text.secondary">
            {position
              ? `${t("selectedCoordinates")}: ${position[0].toFixed(6)}, ${position[1].toFixed(6)}`
              : t("clickToSelectLocation")}
          </Typography>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{readOnly ? t("close") : t("cancel")}</Button>
        {!readOnly && (
          <Button onClick={handleConfirm} variant="contained" disabled={!position}>
            {t("confirmSelection")}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  )
}

export default LocationPickerMap
