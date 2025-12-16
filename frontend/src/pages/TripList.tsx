import { useState } from "react"
import { useNavigate } from "react-router-dom"
import {
  Box,
  Typography,
  Card,
  CardContent,
  CardActions,
  Button,
  Grid,
  Fab,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  CircularProgress,
  Alert,
  InputAdornment,
  Tabs,
  Tab,
} from "@mui/material"
import { DatePicker } from "@mui/x-date-pickers/DatePicker"
import dayjs from "dayjs"
import { Add as AddIcon, CalendarToday, FlightTakeoff, AttachMoney } from "@mui/icons-material"
import { useTrips, useCreateTrip } from "../hooks/useTrips"
import { saveAs } from "file-saver"
import client from "../api/client"

const TripList = () => {
  const navigate = useNavigate()
  const { data: trips, isLoading, error } = useTrips()
  const createTripMutation = useCreateTrip()
  const [open, setOpen] = useState(false)

  // Form state
  const [currency] = useState("AUD") // Default currency
  const [name, setName] = useState("")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [budget, setBudget] = useState("")
  // 0 = Past, 1 = Current, 2 = Future
  const [tabValue, setTabValue] = useState(2)

  // Determine initial tab based on trips
  useState(() => {
    if (trips) {
      const now = dayjs()
      const hasCurrent = trips.some((t) => dayjs(t.startDate).isBefore(now) && dayjs(t.endDate).isAfter(now))
      if (hasCurrent) {
        setTabValue(1)
      } else {
        // Default to Future (2) if no current, or whatever logic. User asked: if no current, show future.
        setTabValue(2)
      }
    }
  })

  const getVisibleTrips = () => {
    if (!trips) return []
    const now = dayjs()
    return trips.filter((trip) => {
      const start = dayjs(trip.startDate)
      const end = dayjs(trip.endDate)

      if (tabValue === 0) {
        // Past
        return end.isBefore(now)
      } else if (tabValue === 1) {
        // Current
        return start.isBefore(now) && end.isAfter(now)
      } else {
        // Future
        return start.isAfter(now)
      }
    })
  }

  const handleCreateTrip = async () => {
    if (name && startDate && endDate) {
      await createTripMutation.mutateAsync({
        name,
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString(),
        budget: budget ? parseFloat(budget) : undefined,
        defaultCurrency: currency,
      })
      setOpen(false)
      // Reset form
      setName("")
      setStartDate("")
      setEndDate("")
      setBudget("")
    }
  }

  const handleViewDetails = (tripId: string) => {
    navigate(`/trips/${tripId}`)
  }

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" mt={4}>
        <CircularProgress />
      </Box>
    )
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mt: 2 }}>
        Error loading trips: {(error as Error).message}
      </Alert>
    )
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          My Trips
        </Typography>
      </Box>

      <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 3 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Tabs value={tabValue} onChange={(_e, val) => setTabValue(val)} aria-label="trip tabs">
            <Tab label="Past" />
            <Tab label="Current" />
            <Tab label="Future" />
          </Tabs>
          <Box display="flex" gap={1}>
            {trips && trips.length > 0 && (
              <Button
                size="small"
                variant="outlined"
                onClick={async () => {
                  try {
                    const res = await client.get("/trips/export")
                    const blob = new Blob([JSON.stringify(res.data.data, null, 2)], { type: "application/json" })
                    saveAs(blob, `trips_export_${dayjs().format("YYYY-MM-DD")}.json`)
                  } catch (e) {
                    alert("Export failed")
                  }
                }}
              >
                Export All
              </Button>
            )}
            <Button
              size="small"
              variant="outlined"
              component="label"
            >
              Import Trip
              <input
                type="file"
                hidden
                accept=".json"
                onChange={async (e) => {
                  const file = e.target.files?.[0]
                  if (!file) return

                  const reader = new FileReader()
                  reader.onload = async (e) => {
                    try {
                      const json = JSON.parse(e.target?.result as string)
                      // Handle both single object or array
                      const items = Array.isArray(json) ? json : [json]

                      for (const item of items) {
                        await client.post("/trips/import", item)
                      }

                      // Refresh
                      window.location.reload()
                    } catch (err) {
                      alert("Import failed: " + err)
                    }
                  }
                  reader.readAsText(file)
                }}
              />
            </Button>
          </Box>
        </Box>
      </Box>

      <Grid container spacing={3}>
        {getVisibleTrips()?.map((trip) => (
          <Grid size={{ xs: 12, sm: 6, md: 4 }} key={trip.id}>
            <Card
              sx={{ height: "100%", display: "flex", flexDirection: "column", cursor: "pointer" }}
              onClick={() => handleViewDetails(trip.id)}
            >
              <CardContent sx={{ flexGrow: 1 }}>
                <Typography variant="h6" component="h2" gutterBottom>
                  {trip.name}
                </Typography>
                <Box display="flex" alignItems="center" color="text.secondary" mb={1}>
                  <CalendarToday fontSize="small" sx={{ mr: 1 }} />
                  <Typography variant="body2">
                    {dayjs(trip.startDate).format("LL")} - {dayjs(trip.endDate).format("LL")}
                  </Typography>
                </Box>
                <Box display="flex" alignItems="center" color="text.secondary" mb={2}>
                  <AttachMoney fontSize="small" sx={{ mr: 1 }} />
                  <Typography variant="body2">
                    {trip.budget ? `${trip.defaultCurrency} ${trip.budget}` : "No budget set"}
                  </Typography>
                </Box>
                <Chip
                  label={
                    dayjs(trip.startDate).isAfter(dayjs())
                      ? "Upcoming"
                      : dayjs(trip.endDate).isBefore(dayjs())
                        ? "Past"
                        : "Ongoing"
                  }
                  color={
                    dayjs(trip.startDate).isAfter(dayjs())
                      ? "primary"
                      : dayjs(trip.endDate).isBefore(dayjs())
                        ? "default"
                        : "success"
                  }
                  size="small"
                />
              </CardContent>
              <CardActions>
                <Button
                  size="small"
                  startIcon={<FlightTakeoff />}
                  onClick={(e) => {
                    e.stopPropagation()
                    handleViewDetails(trip.id)
                  }}
                >
                  View Details
                </Button>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>

      {trips && trips.length === 0 && (
        <Box textAlign="center" py={8}>
          <Typography variant="h5" color="text.secondary" gutterBottom>
            No trips yet
          </Typography>
          <Typography variant="body1" color="text.secondary" paragraph>
            Create your first trip to get started!
          </Typography>
        </Box>
      )}

      <Fab
        color="primary"
        aria-label="add"
        sx={{ position: "fixed", bottom: 16, right: 16 }}
        onClick={() => {
          setName("")
          setStartDate("")
          setEndDate("")
          setBudget("")
          setOpen(true)
        }}
      >
        <AddIcon />
      </Fab>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create New Trip</DialogTitle>
        <DialogContent>
          <Box pt={1} sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <TextField autoFocus label="Trip Name" fullWidth value={name} onChange={(e) => setName(e.target.value)} />
            <DatePicker
              label="Start Date"
              value={startDate ? dayjs(startDate) : null}
              onChange={(newValue) => {
                const isoDate = newValue ? newValue.format("YYYY-MM-DD") : ""
                setStartDate(isoDate)
                // Auto-set End Date if empty or if Start Date is after current End Date
                if (isoDate) {
                  if (!endDate || dayjs(isoDate).isAfter(dayjs(endDate))) {
                    setEndDate(isoDate)
                  }
                }
              }}
              slotProps={{ textField: { fullWidth: true } }}
            />
            <DatePicker
              label="End Date"
              value={endDate ? dayjs(endDate) : null}
              onChange={(newValue) => setEndDate(newValue ? newValue.format("YYYY-MM-DD") : "")}
              slotProps={{ textField: { fullWidth: true } }}
            />
            <TextField
              label="Budget (Optional)"
              type="number"
              fullWidth
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              InputProps={{
                startAdornment: <InputAdornment position="start">{currency}</InputAdornment>,
              }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleCreateTrip} variant="contained" disabled={createTripMutation.isPending}>
            {createTripMutation.isPending ? "Creating..." : "Create Trip"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default TripList
