import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControlLabel,
  Switch,
  MenuItem,
  Grid,
  InputAdornment,
} from "@mui/material"
import React, { useState, useEffect } from "react"
import { MdAccessTime, MdLock, MdLockOpen } from "react-icons/md"

import { DayLocation, TripFeature } from "../../contexts/TripContext"

interface EditTimeModalProps {
  open: boolean
  onClose: () => void
  item: DayLocation | TripFeature | null
  onSave: (updates: Partial<DayLocation | TripFeature>) => Promise<void>
}

const SUBTYPES = [
  { value: "flight", label: "Flight" },
  { value: "airport", label: "Airport" },
  { value: "hotel", label: "Hotel" },
  { value: "restaurant", label: "Restaurant" },
  { value: "activity", label: "Activity" },
  { value: "transport", label: "Transport" },
  { value: "other", label: "Other" },
]

export const EditTimeModal: React.FC<EditTimeModalProps> = ({ open, onClose, item, onSave }) => {
  const [startTime, setStartTime] = useState("")
  const [duration, setDuration] = useState("")
  const [isLocked, setIsLocked] = useState(false)
  const [subtype, setSubtype] = useState("")

  useEffect(() => {
    if (item) {
      setStartTime(item.start_time || "")
      setDuration(item.duration_minutes?.toString() || "")
      setIsLocked(item.is_locked || false)
      setSubtype(item.subtype || "")
    }
  }, [item])

  // Calculate departure time
  const calculateDepartureTime = (): string => {
    if (!startTime || !duration) return ""

    const [hours, minutes] = startTime.split(":").map(Number)
    const durationNum = parseInt(duration)

    const totalMinutes = hours * 60 + minutes + durationNum
    const departureHours = Math.floor(totalMinutes / 60) % 24
    const departureMinutes = totalMinutes % 60

    return `${String(departureHours).padStart(2, "0")}:${String(departureMinutes).padStart(2, "0")}`
  }

  const departureTime = calculateDepartureTime()

  const handleSave = async () => {
    await onSave({
      start_time: startTime || undefined,
      duration_minutes: duration ? parseInt(duration) : undefined,
      is_locked: isLocked,
      subtype: subtype || undefined,
    })
    onClose()
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Edit Logistics</DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 0.5 }}>
          <Grid item xs={12}>
            <TextField
              label="Arrival Time"
              type="time"
              fullWidth
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              InputLabelProps={{ shrink: true }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <MdAccessTime />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              label="Stay Duration (min)"
              type="number"
              fullWidth
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
            />
          </Grid>
          {departureTime && (
            <Grid item xs={12}>
              <TextField
                label="Departure Time"
                value={departureTime}
                fullWidth
                InputProps={{
                  readOnly: true,
                }}
                InputLabelProps={{ shrink: true }}
                helperText="Calculated: Arrival + Stay Duration"
                sx={{
                  "& .MuiInputBase-input": {
                    color: "text.secondary",
                    fontStyle: "italic",
                  },
                }}
              />
            </Grid>
          )}
          <Grid item xs={12}>
            <TextField select label="Type" fullWidth value={subtype} onChange={(e) => setSubtype(e.target.value)}>
              <MenuItem value="">None</MenuItem>
              {SUBTYPES.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12}>
            <FormControlLabel
              control={<Switch checked={isLocked} onChange={(e) => setIsLocked(e.target.checked)} color="primary" />}
              label={
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  {isLocked ? <MdLock /> : <MdLockOpen />}
                  Lock Time (Fixed)
                </div>
              }
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
