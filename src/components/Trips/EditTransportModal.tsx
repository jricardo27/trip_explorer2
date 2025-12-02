import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
  Grid,
  InputAdornment,
} from "@mui/material"
import React, { useState, useEffect } from "react"
import { MdDirectionsCar, MdAttachMoney } from "react-icons/md"

import { DayLocation, TripFeature } from "../../contexts/TripContext"

interface EditTransportModalProps {
  open: boolean
  onClose: () => void
  item: DayLocation | TripFeature | null
  onSave: (updates: Partial<DayLocation | TripFeature>) => Promise<void>
}

const TRANSPORT_MODES = [
  { value: "car", label: "Car" },
  { value: "train", label: "Train" },
  { value: "bus", label: "Bus" },
  { value: "flight", label: "Flight" },
  { value: "ferry", label: "Ferry" },
  { value: "walk", label: "Walk" },
  { value: "bike", label: "Bike" },
  { value: "other", label: "Other" },
]

export const EditTransportModal: React.FC<EditTransportModalProps> = ({ open, onClose, item, onSave }) => {
  const [transportMode, setTransportMode] = useState("")
  const [transportDetails, setTransportDetails] = useState("")
  const [transportCost, setTransportCost] = useState("")
  const [travelTime, setTravelTime] = useState("")

  useEffect(() => {
    if (item) {
      setTransportMode(item.transport_mode || "")
      setTransportDetails(item.transport_details || "")
      setTransportCost(item.transport_cost?.toString() || "")
      setTravelTime(item.travel_time_minutes?.toString() || "")
    }
  }, [item])

  const handleSave = async () => {
    await onSave({
      transport_mode: transportMode || undefined,
      transport_details: transportDetails || undefined,
      transport_cost: transportCost ? parseFloat(transportCost) : undefined,
      travel_time_minutes: travelTime ? parseInt(travelTime) : undefined,
    })
    onClose()
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Edit Transport</DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 0.5 }}>
          <Grid item xs={12}>
            <TextField
              select
              label="Transport Mode"
              fullWidth
              value={transportMode}
              onChange={(e) => setTransportMode(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <MdDirectionsCar />
                  </InputAdornment>
                ),
              }}
            >
              <MenuItem value="">None</MenuItem>
              {TRANSPORT_MODES.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={6}>
            <TextField
              label="Travel Duration (min)"
              type="number"
              fullWidth
              value={travelTime}
              onChange={(e) => setTravelTime(e.target.value)}
              helperText="To get here"
            />
          </Grid>
          <Grid item xs={6}>
            <TextField
              label="Cost"
              type="number"
              fullWidth
              value={transportCost}
              onChange={(e) => setTransportCost(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <MdAttachMoney />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              label="Details / Notes"
              fullWidth
              multiline
              rows={3}
              value={transportDetails}
              onChange={(e) => setTransportDetails(e.target.value)}
              placeholder="e.g., Flight number, train line, booking reference..."
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave} variant="contained">
          Save
        </Button>
      </DialogActions>
    </Dialog>
  )
}
