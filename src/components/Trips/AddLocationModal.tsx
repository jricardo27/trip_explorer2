import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
} from "@mui/material"
import React, { useState } from "react"

import { DayLocation } from "../../contexts/TripContext"

import { LocationAutocomplete, CityOption } from "./LocationAutocomplete"

interface AddLocationModalProps {
  open: boolean
  onClose: () => void
  onAddLocation: (location: Omit<DayLocation, "id" | "trip_day_id" | "created_at">) => void
  dayDate: string
}

export const AddLocationModal: React.FC<AddLocationModalProps> = ({
  open,
  onClose,
  onAddLocation,
  dayDate,
}) => {
  const [selectedCity, setSelectedCity] = useState<CityOption | null>(null)
  const [notes, setNotes] = useState("")
  const [visitOrder, setVisitOrder] = useState(1)

  const handleSubmit = () => {
    if (!selectedCity) return

    const location: Omit<DayLocation, "id" | "trip_day_id" | "created_at"> = {
      country: selectedCity.country_name,
      country_code: selectedCity.country_code,
      city: selectedCity.name,
      latitude: parseFloat(selectedCity.latitude),
      longitude: parseFloat(selectedCity.longitude),
      visit_order: visitOrder,
      notes: notes.trim() || undefined,
    }

    onAddLocation(location)
    handleClose()
  }

  const handleClose = () => {
    setSelectedCity(null)
    setNotes("")
    setVisitOrder(1)
    onClose()
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Add Location to {dayDate}</DialogTitle>
      <DialogContent>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 3, mt: 1 }}>
          <LocationAutocomplete
            value={selectedCity}
            onChange={setSelectedCity}
            label="Search for a city or town"
          />

          {selectedCity && (
            <Box sx={{ p: 2, bgcolor: "background.default", borderRadius: 1 }}>
              <Typography variant="subtitle2" gutterBottom>
                Selected Location Details:
              </Typography>
              <Typography variant="body2">
                <strong>City:</strong> {selectedCity.name}
              </Typography>
              <Typography variant="body2">
                <strong>Country:</strong> {selectedCity.country_name}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Coordinates: {selectedCity.latitude}, {selectedCity.longitude}
              </Typography>
            </Box>
          )}

          <TextField
            label="Notes (optional)"
            multiline
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g., Arriving in the morning, staying at Hotel X..."
            fullWidth
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={!selectedCity}
        >
          Add Location
        </Button>
      </DialogActions>
    </Dialog>
  )
}
