import AutoFixHighIcon from "@mui/icons-material/AutoFixHigh"
import {
  Box,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
  Typography,
  CircularProgress,
  InputAdornment,
  SelectChangeEvent,
} from "@mui/material"
import axios from "axios"
import React, { useState } from "react"

interface AddTransportAlternativeFormProps {
  tripId: string
  fromActivityId: string
  toActivityId: string
  onSuccess: () => void
  onCancel: () => void
}

const AddTransportAlternativeForm: React.FC<AddTransportAlternativeFormProps> = ({
  tripId,
  fromActivityId,
  toActivityId,
  onSuccess,
  onCancel,
}) => {
  const [formData, setFormData] = useState({
    name: "",
    transport_mode: "driving",
    duration_minutes: "",
    buffer_minutes: "0",
    cost: "",
    currency: "AUD",
    description: "",
  })
  const [calculating, setCalculating] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSelectChange = (e: SelectChangeEvent) => {
    const name = e.target.name as string
    const value = e.target.value
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleAutoCalculate = async () => {
    setCalculating(true)
    try {
      // Get activity locations
      const fromRes = await axios.get(`/api/activities/${fromActivityId}`)
      const toRes = await axios.get(`/api/activities/${toActivityId}`)

      const fromLoc = fromRes.data.location
      const toLoc = toRes.data.location

      if (!fromLoc || !toLoc) {
        alert("Cannot calculate route: missing location data")
        return
      }

      // Calculate route
      const routeRes = await axios.post("/api/calculate-route", {
        from: { lat: fromLoc.y, lng: fromLoc.x },
        to: { lat: toLoc.y, lng: toLoc.x },
        mode: formData.transport_mode,
      })

      setFormData((prev) => ({
        ...prev,
        duration_minutes: routeRes.data.duration_minutes.toString(),
        name: `${formData.transport_mode.charAt(0).toUpperCase() + formData.transport_mode.slice(1)} Route`,
      }))
    } catch (err) {
      console.error("Error calculating route:", err)
      alert("Failed to calculate route automatically")
    } finally {
      setCalculating(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      await axios.post("/api/transport-alternatives", {
        trip_id: tripId,
        from_activity_id: fromActivityId,
        to_activity_id: toActivityId,
        ...formData,
        duration_minutes: parseInt(formData.duration_minutes),
        buffer_minutes: parseInt(formData.buffer_minutes),
        cost: formData.cost ? parseFloat(formData.cost) : null,
      })

      onSuccess()
    } catch (err) {
      console.error("Error creating alternative:", err)
      alert("Failed to create transport alternative")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
      <Typography variant="subtitle1" gutterBottom>
        Add Transport Option
      </Typography>

      <Stack spacing={2}>
        <FormControl fullWidth size="small">
          <InputLabel>Mode</InputLabel>
          <Select name="transport_mode" value={formData.transport_mode} label="Mode" onChange={handleSelectChange}>
            <MenuItem value="driving">Driving</MenuItem>
            <MenuItem value="walking">Walking</MenuItem>
            <MenuItem value="cycling">Cycling</MenuItem>
            <MenuItem value="transit">Public Transit</MenuItem>
            <MenuItem value="flight">Flight</MenuItem>
            <MenuItem value="train">Train</MenuItem>
            <MenuItem value="bus">Bus</MenuItem>
            <MenuItem value="ferry">Ferry</MenuItem>
          </Select>
        </FormControl>

        <TextField
          name="name"
          label="Name (e.g., Uber, Rental Car)"
          value={formData.name}
          onChange={handleTextChange}
          fullWidth
          size="small"
          required
        />

        <Stack direction="row" spacing={1} alignItems="flex-start">
          <TextField
            name="duration_minutes"
            label="Duration (min)"
            type="number"
            value={formData.duration_minutes}
            onChange={handleTextChange}
            fullWidth
            size="small"
            required
          />
          <Button
            variant="outlined"
            onClick={handleAutoCalculate}
            disabled={calculating}
            sx={{ minWidth: 120, height: 40 }}
            startIcon={calculating ? <CircularProgress size={20} /> : <AutoFixHighIcon />}
          >
            Auto
          </Button>
        </Stack>

        <TextField
          name="buffer_minutes"
          label="Buffer (min)"
          type="number"
          value={formData.buffer_minutes}
          onChange={handleTextChange}
          fullWidth
          size="small"
          helperText="Extra time for traffic, parking, etc."
        />

        <Stack direction="row" spacing={2}>
          <TextField
            name="cost"
            label="Cost"
            type="number"
            value={formData.cost}
            onChange={handleTextChange}
            fullWidth
            size="small"
            InputProps={{
              startAdornment: <InputAdornment position="start">$</InputAdornment>,
            }}
          />
          <TextField
            name="currency"
            label="Currency"
            value={formData.currency}
            onChange={handleTextChange}
            sx={{ width: 100 }}
            size="small"
          />
        </Stack>

        <TextField
          name="description"
          label="Description / Notes"
          value={formData.description}
          onChange={handleTextChange}
          fullWidth
          multiline
          rows={2}
          size="small"
        />

        <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
          <Button variant="outlined" fullWidth onClick={onCancel} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" variant="contained" fullWidth disabled={submitting}>
            {submitting ? "Saving..." : "Save"}
          </Button>
        </Stack>
      </Stack>
    </Box>
  )
}

export default AddTransportAlternativeForm
