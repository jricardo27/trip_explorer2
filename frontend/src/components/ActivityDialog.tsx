import { Map as MapIcon, Close as CloseIcon, Lock, LockOpen } from "@mui/icons-material"
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
  Chip,
  IconButton,
} from "@mui/material"
import { DateTimePicker } from "@mui/x-date-pickers/DateTimePicker"
import dayjs from "dayjs"
import { useState, useEffect } from "react"

import { useTripMembers } from "../hooks/useTripMembers"
import { useLanguageStore } from "../stores/languageStore"
import { ActivityType } from "../types"
import type { Activity, TripDay } from "../types"

import LocationPickerMap from "./LocationPickerMap"

const DAYS_OF_WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

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
  initialCoordinates?: { lat: number; lng: number }
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
  initialCoordinates,
}: ActivityDialogProps) => {
  const handleClose = (event: object, reason: string) => {
    if (reason === "backdropClick") return
    onClose(event, reason)
  }
  const { t } = useLanguageStore()
  const [name, setName] = useState("")
  const [activityType, setActivityType] = useState<ActivityType>(ActivityType.ATTRACTION)
  const [scheduledStart, setScheduledStart] = useState<dayjs.Dayjs | null>(null)
  const [scheduledEnd, setScheduledEnd] = useState<dayjs.Dayjs | null>(null)
  const [estimatedCost, setEstimatedCost] = useState("")
  const [actualCost, setActualCost] = useState("")
  const [isPaid, setIsPaid] = useState(false)
  const [latitude, setLatitude] = useState("")
  const [longitude, setLongitude] = useState("")
  const [notes, setNotes] = useState("")
  const [availableDays, setAvailableDays] = useState<string[]>([])
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([])

  // New Fields
  const [priority, setPriority] = useState<string>("normal")
  const [isLocked, setIsLocked] = useState(false)

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
        setActualCost(activity.actualCost?.toString() || "")
        setIsPaid(activity.isPaid || false)
        setLatitude(activity.latitude?.toString() || "")
        setLongitude(activity.longitude?.toString() || "")
        setNotes(activity.notes || "")
        setAvailableDays(activity.availableDays || [])
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
        setActualCost("")
        setIsPaid(false)
        setLatitude(initialCoordinates?.lat.toString() || "")
        setLongitude(initialCoordinates?.lng.toString() || "")
        setNotes("")
        setAvailableDays([])
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
      setError(t("endDateBeforeStart"))
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
        setError(`${t("dateOutsideTripRange")} (${tripStartDay.format("L")} - ${tripEndDay.format("L")})`)
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
        actualCost: actualCost ? parseFloat(actualCost) : undefined,
        isPaid,
        latitude: latitude ? parseFloat(latitude) : undefined,
        longitude: longitude ? parseFloat(longitude) : undefined,
        notes,
        availableDays,
        participantIds: selectedMemberIds,
        priority,
        isLocked,
      })
    } catch (err: any) {
      console.error("Failed to save activity:", err)
      const errorMessage =
        err.response?.data?.error?.message || err.response?.data?.error || err.message || t("failedToSave")
      setError(typeof errorMessage === "object" ? JSON.stringify(errorMessage) : errorMessage)
    }
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth fullScreen={fullScreen}>
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          {activity ? t("editActivity") : t("addActivity")}
          {fullScreen && (
            <IconButton onClick={() => onClose(undefined, "closeButton")} size="small">
              <CloseIcon />
            </IconButton>
          )}
        </Box>
      </DialogTitle>
      <DialogContent dividers>
        <form id="activity-form" onSubmit={handleSubmit}>
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
                  label={t("activityName")}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </Grid>
              <Grid size={{ xs: 6 }}>
                <FormControl fullWidth>
                  <InputLabel>{t("type")}</InputLabel>
                  <Select
                    value={activityType}
                    label={t("type")}
                    onChange={(e) => setActivityType(e.target.value as ActivityType)}
                  >
                    {Object.values(ActivityType).map((type) => (
                      <MenuItem key={type} value={type}>
                        {t(type as any)}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 6 }}>
                <FormControl fullWidth>
                  <InputLabel>{t("priority")}</InputLabel>
                  <Select value={priority} label={t("priority")} onChange={(e) => setPriority(e.target.value)}>
                    <MenuItem value="normal">{t("standard")}</MenuItem>
                    <MenuItem value="optional">{t("optional")}</MenuItem>
                    <MenuItem value="mandatory">{t("mandatory")}</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12 }}>
                <FormControl fullWidth>
                  <InputLabel>{t("participants")}</InputLabel>
                  <Select
                    multiple
                    value={selectedMemberIds}
                    label={t("participants")}
                    onChange={(e) => {
                      const val = e.target.value
                      setSelectedMemberIds(typeof val === "string" ? val.split(",") : val)
                    }}
                    renderValue={(selected) => (
                      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                        {selected.map((value) => {
                          const member = members.find((m) => m.id === value)
                          return (
                            <Chip
                              key={value}
                              label={member?.name || "Unknown"}
                              size="small"
                              avatar={member?.avatarUrl ? <Avatar src={member.avatarUrl} /> : undefined}
                            />
                          )
                        })}
                      </Box>
                    )}
                  >
                    {members.map((member) => (
                      <MenuItem key={member.id} value={member.id}>
                        <Checkbox checked={selectedMemberIds.indexOf(member.id) > -1} />
                        <ListItemText primary={member.name} />
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 6 }}>
                <DateTimePicker
                  label={t("startTime")}
                  value={scheduledStart}
                  minDate={tripStartDate ? dayjs(tripStartDate) : undefined}
                  maxDate={tripEndDate ? dayjs(tripEndDate) : undefined}
                  onChange={(newValue: any) => setScheduledStart(newValue)}
                  slotProps={{ textField: { fullWidth: true } }}
                />
              </Grid>
              <Grid size={{ xs: 6 }}>
                <DateTimePicker
                  label={t("endTime")}
                  value={scheduledEnd}
                  minDate={tripStartDate ? dayjs(tripStartDate) : undefined}
                  maxDate={tripEndDate ? dayjs(tripEndDate) : undefined}
                  onChange={(newValue: any) => {
                    if (newValue) {
                      setScheduledEnd(newValue)
                    }
                  }}
                  slotProps={{ textField: { fullWidth: true } }}
                />
              </Grid>
              <Grid size={{ xs: 6 }}>
                <TextField
                  fullWidth
                  label={t("estimatedCost")}
                  type="number"
                  value={estimatedCost}
                  onChange={(e) => setEstimatedCost(e.target.value)}
                  InputProps={{ startAdornment: "$" }}
                />
              </Grid>
              <Grid size={{ xs: 6 }}>
                <TextField
                  fullWidth
                  label={t("actualCost")}
                  type="number"
                  value={actualCost}
                  onChange={(e) => setActualCost(e.target.value)}
                  InputProps={{ startAdornment: "$" }}
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <Box display="flex" alignItems="center" gap={3}>
                  <Box display="flex" alignItems="center">
                    <Checkbox checked={isPaid} onChange={(e) => setIsPaid(e.target.checked)} />
                    <Typography variant="body2">{t("markAsPaid")}</Typography>
                  </Box>
                  <Box display="flex" alignItems="center">
                    <Checkbox
                      checked={isLocked}
                      onChange={(e) => setIsLocked(e.target.checked)}
                      icon={<LockOpen fontSize="small" />}
                      checkedIcon={<Lock fontSize="small" />}
                    />
                    <Typography variant="body2">{isLocked ? t("locked") : t("unlocked")}</Typography>
                  </Box>
                </Box>
              </Grid>
              <Grid size={{ xs: 5 }}>
                <TextField
                  fullWidth
                  label={t("latitude")}
                  type="number"
                  value={latitude}
                  onChange={(e) => setLatitude(e.target.value)}
                  inputProps={{ step: "any" }}
                />
              </Grid>
              <Grid size={{ xs: 5 }}>
                <TextField
                  fullWidth
                  label={t("longitude")}
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
                  title={t("selectFromMap")}
                >
                  <MapIcon />
                </Button>
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField
                  fullWidth
                  label={t("activityNotes")}
                  multiline
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </Grid>

              <Grid size={{ xs: 12 }}>
                <FormControl fullWidth>
                  <InputLabel>{t("availableDays")}</InputLabel>
                  <Select
                    multiple
                    value={availableDays}
                    label={t("availableDays")}
                    onChange={(e) =>
                      setAvailableDays(typeof e.target.value === "string" ? e.target.value.split(",") : e.target.value)
                    }
                    renderValue={(selected) => (
                      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                        {selected.map((value) => (
                          <Chip key={value} label={value} size="small" />
                        ))}
                      </Box>
                    )}
                  >
                    {DAYS_OF_WEEK.map((day) => (
                      <MenuItem key={day} value={day}>
                        <Checkbox checked={availableDays.indexOf(day) > -1} />
                        <ListItemText primary={t(day.toLowerCase() as any) || day} />
                      </MenuItem>
                    ))}
                  </Select>
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
                    {t("availableDaysHint")}
                  </Typography>
                </FormControl>
              </Grid>

              <Grid size={{ xs: 12 }}>
                <Typography variant="subtitle2" gutterBottom>
                  {t("whoIsGoing")}
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
                    {t("noMembers")}
                  </Typography>
                )}
              </Grid>
            </Grid>
          </Box>
        </form>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => onClose(undefined, "cancelButton")}>{t("cancel")}</Button>
        <Button type="submit" form="activity-form" variant="contained" disabled={isLoading}>
          {isLoading ? t("saving") + "..." : activity ? t("saveChanges") : t("addActivity")}
        </Button>
      </DialogActions>
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
