import { useState, useEffect } from "react"
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Grid,
  MenuItem,
  Select,
  InputLabel,
  FormControl,
  Box,
  Alert,
} from "@mui/material"
import { DateTimePicker } from "@mui/x-date-pickers/DateTimePicker"
import dayjs from "dayjs"
import { ActivityType } from "../types"
import type { Activity, TripDay } from "../types"

interface ActivityDialogProps {
  open: boolean
  onClose: (event?: object, reason?: string) => void
  onSubmit: (data: Partial<Activity> & { tripId: string; tripDayId?: string }) => Promise<void>
  isLoading: boolean
  tripId: string
  tripDayId?: string
  activity?: Activity
  tripStartDate?: string
  tripEndDate?: string
  tripDays?: TripDay[]
}

const ActivityDialog = ({
  open,
  onClose,
  onSubmit,
  isLoading,
  tripId,
  tripDayId,
  activity,
  tripStartDate,
  tripEndDate,
  tripDays,
}: ActivityDialogProps) => {
  const handleClose = (event: object, reason: string) => {
    if (reason === "backdropClick") return
    onClose(event, reason)
  }
  const [name, setName] = useState("")
  const [activityType, setActivityType] = useState<ActivityType>(ActivityType.ATTRACTION)
  const [scheduledStart, setScheduledStart] = useState<dayjs.Dayjs | null>(null)
  const [scheduledEnd, setScheduledEnd] = useState<dayjs.Dayjs | null>(null)
  const [estimatedCost, setEstimatedCost] = useState("")
  const [notes, setNotes] = useState("")
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setError(null) // Clear error on open
      if (activity) {
        setName(activity.name)
        setActivityType(activity.activityType)
        setScheduledStart(activity.scheduledStart ? dayjs(activity.scheduledStart) : null)
        setScheduledEnd(activity.scheduledEnd ? dayjs(activity.scheduledEnd) : null)
        setEstimatedCost(activity.estimatedCost?.toString() || "")
        setNotes(activity.notes || "")
      } else {
        // Reset for create
        setName("")
        setActivityType(ActivityType.ATTRACTION)
        setScheduledStart(null)
        setScheduledEnd(null)
        setEstimatedCost("")
        setNotes("")
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const validateDates = () => {
    if (!scheduledStart && !scheduledEnd) return true

    const start = scheduledStart ? scheduledStart.toDate() : null
    const end = scheduledEnd ? scheduledEnd.toDate() : null
    const tripStart = tripStartDate ? new Date(tripStartDate) : null
    const tripEnd = tripEndDate ? new Date(tripEndDate) : null

    if (start && end && end < start) {
      setError("End date must be after start date")
      return false
    }

    if (tripStart && tripEnd) {
      // Check boundaries
      // We allow slight buffer or just strict comparison. Strict for now.
      // Adjust tripEnd to end of day? Usually tripEndDate is Date only (bad assumption? No, schema says DateTime).
      // Usually trip dates are just YYYY-MM-DD treated as 00:00 or similar.
      // Let's assume strict usage.
      if (start && (start < tripStart || start > tripEnd)) {
        setError(
          `Start date must be within trip dates (${new Date(tripStart).toLocaleDateString()} - ${new Date(tripEnd).toLocaleDateString()})`,
        )
        return false
      }
      if (end && (end < tripStart || end > tripEnd)) {
        setError(
          `End date must be within trip dates (${new Date(tripStart).toLocaleDateString()} - ${new Date(tripEnd).toLocaleDateString()})`,
        )
        return false
      }
    }

    setError(null)
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateDates()) return

    // Smart Day Assignment
    let finalTripDayId = activity?.tripDayId || tripDayId
    if (scheduledStart && tripDays) {
      const startDate = scheduledStart.toDate()
      const matchingDay = tripDays.find((day) => {
        const dayDate = new Date(day.date)
        return (
          dayDate.getDate() === startDate.getDate() &&
          dayDate.getMonth() === startDate.getMonth() &&
          dayDate.getFullYear() === startDate.getFullYear()
        )
      })
      if (matchingDay) {
        finalTripDayId = matchingDay.id
      }
    }

    try {
      await onSubmit({
        id: activity?.id, // Pass ID if editing
        tripId,
        tripDayId: finalTripDayId, // Use smart assigned day
        name,
        activityType,
        scheduledStart: scheduledStart ? scheduledStart.toISOString() : undefined,
        scheduledEnd: scheduledEnd ? scheduledEnd.toISOString() : undefined,
        estimatedCost: estimatedCost ? parseFloat(estimatedCost) : undefined,
        notes,
      })
    } catch (err: any) {
      console.error("Failed to save activity:", err)
      const errorMessage =
        err.response?.data?.error?.message || err.response?.data?.error || err.message || "Failed to save activity"
      setError(typeof errorMessage === "object" ? JSON.stringify(errorMessage) : errorMessage)
    }
  }

  return (
    <Dialog open={open} onClose={handleClose as any} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>{activity ? "Edit Activity" : "Add Activity"}</DialogTitle>
        <DialogContent>
          <Box pt={2}>
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}
            <Grid container spacing={2}>
              <Grid size={{ xs: 12 }}>
                <TextField
                  fullWidth
                  label="Activity Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <FormControl fullWidth>
                  <InputLabel>Type</InputLabel>
                  <Select
                    value={activityType}
                    label="Type"
                    onChange={(e) => setActivityType(e.target.value as ActivityType)}
                  >
                    {Object.values(ActivityType).map((type) => (
                      <MenuItem key={type} value={type}>
                        {type}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 6 }}>
                <DateTimePicker
                  label="Start Time"
                  value={scheduledStart}
                  onChange={(newValue) => setScheduledStart(newValue)}
                  slotProps={{ textField: { fullWidth: true } }}
                />
              </Grid>
              <Grid size={{ xs: 6 }}>
                <DateTimePicker
                  label="End Time"
                  value={scheduledEnd}
                  onChange={(newValue) => setScheduledEnd(newValue)}
                  slotProps={{ textField: { fullWidth: true } }}
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField
                  fullWidth
                  label="Estimated Cost"
                  type="number"
                  value={estimatedCost}
                  onChange={(e) => setEstimatedCost(e.target.value)}
                  InputProps={{ startAdornment: "$" }}
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField
                  fullWidth
                  label="Notes"
                  multiline
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => onClose(undefined, "cancelButton")}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={isLoading}>
            {isLoading ? "Saving..." : activity ? "Save Changes" : "Add Activity"}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}

export default ActivityDialog
