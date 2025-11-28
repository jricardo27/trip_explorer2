import { Dialog, DialogTitle, DialogContent, TextField, DialogActions, Button, Alert } from "@mui/material"
import React, { useState } from "react"

import { Trip } from "../../contexts/TripContext"

interface CreateTripModalProps {
  open: boolean
  onClose: () => void
  onCreateTrip: (tripData: Omit<Trip, "id" | "created_at" | "updated_at">) => Promise<void>
}

export const CreateTripModal: React.FC<CreateTripModalProps> = ({ open, onClose, onCreateTrip }) => {
  const [name, setName] = useState("")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  React.useEffect(() => {
    if (startDate) {
      const start = new Date(startDate)
      const nextDay = new Date(start)
      nextDay.setDate(start.getDate() + 1)
      const nextDayStr = nextDay.toISOString().split("T")[0]

      // If end date is empty or before the new start date + 1, update it
      if (!endDate || endDate < nextDayStr) {
        setEndDate(nextDayStr)
      }
    }
  }, [startDate, endDate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      await onCreateTrip({
        name,
        start_date: startDate,
        end_date: endDate,
        days: [],
      })
      onClose()
      setName("")
      setStartDate("")
      setEndDate("")
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError("Failed to create trip")
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Create New Trip</DialogTitle>
      <form onSubmit={handleSubmit}>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          <TextField
            autoFocus
            margin="dense"
            label="Trip Name"
            fullWidth
            variant="outlined"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="Start Date"
            type="date"
            fullWidth
            variant="outlined"
            InputLabelProps={{ shrink: true }}
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            required
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="End Date"
            type="date"
            fullWidth
            variant="outlined"
            InputLabelProps={{ shrink: true }}
            inputProps={{ min: startDate }}
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            required
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={loading}>
            {loading ? "Creating..." : "Create Trip"}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}
