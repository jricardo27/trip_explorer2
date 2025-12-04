import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
} from "@mui/material"
import React, { useState } from "react"

import { TRANSPORT_MODES } from "../../constants/transportModes"
import { DayLocation } from "../../contexts/TripContext"

import { LocationAutocomplete, CityOption } from "./LocationAutocomplete"

interface AddLocationModalProps {
  open: boolean
  onClose: () => void
  onAddLocation: (location: Omit<DayLocation, "id" | "trip_day_id" | "created_at">) => void
  dayDate: string
  isPlanningMode?: boolean
}

export const AddLocationModal: React.FC<AddLocationModalProps> = ({
  open,
  onClose,
  onAddLocation,
  dayDate,
  isPlanningMode = false,
}) => {
  const [selectedCity, setSelectedCity] = useState<CityOption | null>(null)
  const [notes, setNotes] = useState("")
  const [visitOrder, setVisitOrder] = useState(1)
  const [transportMode, setTransportMode] = useState("")
  const [transportDetails, setTransportDetails] = useState("")
  const [transportCost, setTransportCost] = useState("")
  const [durationMinutes, setDurationMinutes] = useState("")
  const [startTime, setStartTime] = useState("")
  const [endTime, setEndTime] = useState("")

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
      transport_mode: transportMode || undefined,
      transport_details: transportDetails || undefined,
      transport_cost: transportCost ? parseFloat(transportCost) : undefined,
      duration_minutes: durationMinutes ? parseInt(durationMinutes) : undefined,
      start_time: startTime || undefined,
      end_time: endTime || undefined,
      visited: !isPlanningMode,
      planned: isPlanningMode,
    }

    onAddLocation(location)
    handleClose()
  }

  const handleClose = () => {
    setSelectedCity(null)
    setNotes("")
    setVisitOrder(1)
    setTransportMode("")
    setTransportDetails("")
    setTransportCost("")
    setDurationMinutes("")
    setStartTime("")
    setEndTime("")
    onClose()
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        Add Location to
        {dayDate}
      </DialogTitle>
      <DialogContent>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 3, mt: 1 }}>
          <LocationAutocomplete value={selectedCity} onChange={setSelectedCity} label="Search for a city or town" />

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

          <Box sx={{ display: "flex", gap: 2 }}>
            <FormControl fullWidth>
              <InputLabel>Transport Mode</InputLabel>
              <Select value={transportMode} label="Transport Mode" onChange={(e) => setTransportMode(e.target.value)}>
                <MenuItem value="">
                  <em>None</em>
                </MenuItem>
                {TRANSPORT_MODES.map((mode) => (
                  <MenuItem key={mode.id} value={mode.id}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <mode.icon />
                      {mode.label}
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="Duration (mins)"
              type="number"
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(e.target.value)}
              fullWidth
            />
          </Box>

          <Box sx={{ display: "flex", gap: 2 }}>
            <TextField
              label="Transport Details"
              value={transportDetails}
              onChange={(e) => setTransportDetails(e.target.value)}
              placeholder="e.g., Flight AA123"
              fullWidth
            />
            <TextField
              label="Cost"
              type="number"
              value={transportCost}
              onChange={(e) => setTransportCost(e.target.value)}
              fullWidth
            />
          </Box>

          <Box sx={{ display: "flex", gap: 2 }}>
            <TextField
              label="Start Time"
              type="time"
              InputLabelProps={{ shrink: true }}
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              fullWidth
            />
            <TextField
              label="End Time"
              type="time"
              InputLabelProps={{ shrink: true }}
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              fullWidth
            />
          </Box>

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
        <Button onClick={handleSubmit} variant="contained" disabled={!selectedCity}>
          Add Location
        </Button>
      </DialogActions>
    </Dialog>
  )
}
