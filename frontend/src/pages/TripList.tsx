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
} from "@mui/material"
import { Add as AddIcon, CalendarToday, FlightTakeoff, AttachMoney } from "@mui/icons-material"
import { useTrips, useCreateTrip } from "../hooks/useTrips"

const TripList = () => {
  const navigate = useNavigate()
  const { data: trips, isLoading, error } = useTrips()
  const createTripMutation = useCreateTrip()
  const [open, setOpen] = useState(false)

  // Form state
  const [name, setName] = useState("")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [budget, setBudget] = useState("")
  const [currency] = useState("USD") // Removed setCurrency as it was unused for now

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

      <Grid container spacing={3}>
        {trips?.map((trip) => (
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
                    {new Date(trip.startDate).toLocaleDateString()} - {new Date(trip.endDate).toLocaleDateString()}
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
                    new Date(trip.startDate) > new Date()
                      ? "Upcoming"
                      : new Date(trip.endDate) < new Date()
                        ? "Past"
                        : "Ongoing"
                  }
                  color={
                    new Date(trip.startDate) > new Date()
                      ? "primary"
                      : new Date(trip.endDate) < new Date()
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
        onClick={() => setOpen(true)}
      >
        <AddIcon />
      </Fab>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create New Trip</DialogTitle>
        <DialogContent>
          <Box pt={1} sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <TextField autoFocus label="Trip Name" fullWidth value={name} onChange={(e) => setName(e.target.value)} />
            <TextField
              label="Start Date"
              type="date"
              fullWidth
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="End Date"
              type="date"
              fullWidth
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
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
