import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
} from "@mui/material"
import React, { useState, useEffect } from "react"

import { TRANSPORT_MODES } from "../../constants/transportModes"
import { DayLocation, TripFeature } from "../../contexts/TripContext"

interface EditItemModalProps {
  open: boolean
  onClose: () => void
  onSave: (id: string, updates: Partial<TripFeature | DayLocation>) => void
  item: DayLocation | TripFeature | null
  type: "location" | "feature"
}

export const EditItemModal: React.FC<EditItemModalProps> = ({ open, onClose, onSave, item, type }) => {
  const [notes, setNotes] = useState("")
  const [transportMode, setTransportMode] = useState("")
  const [transportDetails, setTransportDetails] = useState("")
  const [transportCost, setTransportCost] = useState("")
  const [durationMinutes, setDurationMinutes] = useState("")
  const [startTime, setStartTime] = useState("")
  const [endTime, setEndTime] = useState("")

  useEffect(() => {
    if (item) {
      if (type === "location") {
        const loc = item as DayLocation
        setNotes(loc.notes || "")
      } else {
        // Features might not have notes in the same way, or we store it in properties?
        // For now, let's assume we don't edit notes for features here, or we add a notes field to saved_features
        // The schema update didn't add 'notes' to saved_features, only transport/time.
        setNotes("")
      }

      setTransportMode(item.transport_mode || "")
      setTransportDetails(item.transport_details || "")
      setTransportCost(item.transport_cost?.toString() || "")
      setDurationMinutes(item.duration_minutes?.toString() || "")
      setStartTime(item.start_time || "")
      setEndTime(item.end_time || "")
    }
  }, [item, type])

  const handleSubmit = () => {
    if (!item) return

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updates: any = {
      transport_mode: transportMode.trim() || null,
      transport_details: transportDetails.trim() || null,
      transport_cost: transportCost ? parseFloat(transportCost) : null,
      duration_minutes: durationMinutes ? parseInt(durationMinutes) : null,
      start_time: startTime || null,
      end_time: endTime || null,
    }

    if (type === "location") {
      updates.notes = notes.trim() || null
    }

    const itemId = type === "feature" ? (item as TripFeature).properties.id : (item as DayLocation).id
    onSave(itemId, updates)
    onClose()
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Edit Details</DialogTitle>
      <DialogContent>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 3, mt: 1 }}>
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

          {type === "location" && (
            <TextField
              label="Notes"
              multiline
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              fullWidth
            />
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} variant="contained">
          Save
        </Button>
      </DialogActions>
    </Dialog>
  )
}
