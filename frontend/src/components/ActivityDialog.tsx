import { Map as MapIcon } from "@mui/icons-material"
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
  Checkbox,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
  Typography,
  ListItemButton,
} from "@mui/material"
import { DateTimePicker } from "@mui/x-date-pickers/DateTimePicker"
import dayjs from "dayjs"
import { useState, useEffect } from "react"

import { useTripMembers } from "../hooks/useTripMembers"
import { ActivityType } from "../types"
import type { Activity, TripDay } from "../types"

import LocationPickerMap from "./LocationPickerMap"

interface ActivityDialogProps {
  open: boolean
  onClose: (event?: object, reason?: string) => void
  onSubmit: (
    data: Partial<Activity> & { tripId: string; tripDayId?: string; participantIds?: string[] },
  ) => Promise<void>
  isLoading: boolean
  tripId: string
  tripDayId?: string
  activity?: Activity
  tripStartDate?: string
  tripEndDate?: string
  tripDays?: TripDay[]
  fullScreen?: boolean
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
  fullScreen,
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
  const [latitude, setLatitude] = useState("")
  const [longitude, setLongitude] = useState("")
  const [notes, setNotes] = useState("")
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [mapPickerOpen, setMapPickerOpen] = useState(false)

  const { members } = useTripMembers(tripId)

  useEffect(() => {
    if (open) {
      setError(null) // Clear error on open
      if (activity) {
        setName(activity.name)
        setActivityType(activity.activityType)
        setScheduledStart(activity.scheduledStart ? dayjs(activity.scheduledStart) : null)
        setScheduledEnd(activity.scheduledEnd ? dayjs(activity.scheduledEnd) : null)
        setEstimatedCost(activity.estimatedCost?.toString() || "")
        setLatitude(activity.latitude?.toString() || "")
        setLongitude(activity.longitude?.toString() || "")
        setLatitude(activity.latitude?.toString() || "")
        setLongitude(activity.longitude?.toString() || "")
        setNotes(activity.notes || "")
        setSelectedMemberIds(activity.participants?.map((p) => p.memberId) || [])
      } else {
        // Reset for create
        setName("")
        setActivityType(ActivityType.ATTRACTION)

        // Pre-set date if tripDayId is provided
        let defaultStart = null
        let defaultEnd = null

        if (tripDayId && tripDays) {
          const day = tripDays.find((d) => d.id === tripDayId)
          if (day) {
            // Default to 9:00 AM on the selected day
            defaultStart = dayjs(day.date).hour(9).minute(0).second(0)
            defaultEnd = defaultStart.add(1, "hour")
          }
        } else if (tripStartDate) {
          // Default to 9:00 AM on the trip start date
          defaultStart = dayjs(tripStartDate).hour(9).minute(0).second(0)
          defaultEnd = defaultStart.add(1, "hour")
        }

        setScheduledStart(defaultStart)
        setScheduledEnd(defaultEnd)
        setEstimatedCost("")
        setLatitude("")
        setLongitude("")
        setLongitude("")
        setNotes("")
        setNotes("")
        setSelectedMemberIds(members.map((m) => m.id))
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]) // members is external, we rely on open trigger. If members load later, we might miss it unless we add logic.
  // Ideally members should be passed as prop or stable.

  const handleToggleMember = (memberId: string) => {
    setSelectedMemberIds((prev) =>
      prev.includes(memberId) ? prev.filter((id) => id !== memberId) : [...prev, memberId],
    )
  }

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
      // Use dayjs for boundary checks to ignore time components and handling timezones correctly
      // We want to ensure the activity starts on or after the trip start DAY,
      // and ends on or before the trip end DAY.
      const tripStartDay = dayjs(tripStart).startOf("day")
      const tripEndDay = dayjs(tripEnd).endOf("day")

      const activityStart = dayjs(start)
      const activityEnd = dayjs(end)

      if (start && (activityStart.isBefore(tripStartDay) || activityStart.isAfter(tripEndDay))) {
        setError(`Start date must be within trip dates (${tripStartDay.format("L")} - ${tripEndDay.format("L")})`)
        return false
      }
      if (end && (activityEnd.isBefore(tripStartDay) || activityEnd.isAfter(tripEndDay))) {
        setError(`End date must be within trip dates (${tripStartDay.format("L")} - ${tripEndDay.format("L")})`)
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
      const startDayjs = dayjs(scheduledStart)
      const matchingDay = tripDays.find((day) => {
        // parsing day.date with dayjs ensures consistent handling
        // using format('YYYY-MM-DD') avoids timezone issues during comparison
        const dayFormatted = dayjs(day.date).format("YYYY-MM-DD")
        const startFormatted = startDayjs.format("YYYY-MM-DD")
        return dayFormatted === startFormatted
      })
      if (matchingDay) {
        finalTripDayId = matchingDay.id
      }
    }

    // Validate that we have a trip day assigned
    if (!finalTripDayId) {
      setError(
        "Cannot create activity: The selected start date does not match any trip day. Please select a date within the trip period.",
      )
      return
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
        latitude: latitude ? parseFloat(latitude) : undefined,
        longitude: longitude ? parseFloat(longitude) : undefined,
        notes,
        participantIds: selectedMemberIds,
      })
    } catch (err: any) {
      console.error("Failed to save activity:", err)
      const errorMessage =
        err.response?.data?.error?.message || err.response?.data?.error || err.message || "Failed to save activity"
      setError(typeof errorMessage === "object" ? JSON.stringify(errorMessage) : errorMessage)
    }
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth fullScreen={fullScreen}>
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
                  minDate={tripStartDate ? dayjs(tripStartDate) : undefined}
                  maxDate={tripEndDate ? dayjs(tripEndDate) : undefined}
                  onChange={(newValue: any) => setScheduledStart(newValue)}
                  slotProps={{ textField: { fullWidth: true } }}
                />
              </Grid>
              <Grid size={{ xs: 6 }}>
                <DateTimePicker
                  label="End Time"
                  value={scheduledEnd}
                  minDate={tripStartDate ? dayjs(tripStartDate) : undefined}
                  maxDate={tripEndDate ? dayjs(tripEndDate) : undefined}
                  onChange={(newValue: any) => {
                    if (newValue) {
                      setScheduledEnd(newValue)
                    }
                  }}
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
              <Grid size={{ xs: 5 }}>
                <TextField
                  fullWidth
                  label="Latitude"
                  type="number"
                  value={latitude}
                  onChange={(e) => setLatitude(e.target.value)}
                  inputProps={{ step: "any" }}
                />
              </Grid>
              <Grid size={{ xs: 5 }}>
                <TextField
                  fullWidth
                  label="Longitude"
                  type="number"
                  value={longitude}
                  onChange={(e) => setLongitude(e.target.value)}
                  inputProps={{ step: "any" }}
                />
              </Grid>
              <Grid size={{ xs: 2 }} sx={{ display: "flex", alignItems: "center" }}>
                <Button
                  variant="outlined"
                  fullWidth
                  onClick={() => setMapPickerOpen(true)}
                  sx={{ height: 56 }}
                  title="Select from Map"
                >
                  <MapIcon />
                </Button>
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

              <Grid size={{ xs: 12 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Who&apos;s going?
                </Typography>
                {members.length > 0 ? (
                  <List
                    dense
                    sx={{ width: "100%", bgcolor: "background.paper", border: "1px solid #e0e0e0", borderRadius: 1 }}
                  >
                    {members.map((member) => {
                      const labelId = `checkbox-list-secondary-label-${member.id}`
                      return (
                        <ListItem key={member.id} disablePadding>
                          <ListItemButton onClick={() => handleToggleMember(member.id)} dense>
                            <ListItemAvatar>
                              <Avatar sx={{ bgcolor: member.color, width: 32, height: 32, fontSize: "0.875rem" }}>
                                {member.name.charAt(0)}
                              </Avatar>
                            </ListItemAvatar>
                            <ListItemText id={labelId} primary={member.name} />
                            <Checkbox
                              edge="end"
                              checked={selectedMemberIds.indexOf(member.id) !== -1}
                              tabIndex={-1}
                              disableRipple
                              inputProps={{ "aria-labelledby": labelId }}
                            />
                          </ListItemButton>
                        </ListItem>
                      )
                    })}
                  </List>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    No members in this trip yet.
                  </Typography>
                )}
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
      <LocationPickerMap
        open={mapPickerOpen}
        onClose={() => setMapPickerOpen(false)}
        initialLat={latitude ? parseFloat(latitude) : undefined}
        initialLng={longitude ? parseFloat(longitude) : undefined}
        onSelect={(lat, lng) => {
          setLatitude(lat.toString())
          setLongitude(lng.toString())
        }}
      />
    </Dialog>
  )
}

export default ActivityDialog
