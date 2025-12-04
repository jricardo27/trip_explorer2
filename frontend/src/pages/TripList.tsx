import { useState } from 'react'
import {
    Container,
    Typography,
    Box,
    Button,
    Card,
    CardContent,
    CardActions,
    Grid,
    Chip,
    CircularProgress,
    Alert
} from '@mui/material'
import { Add as AddIcon } from '@mui/icons-material'
import { useTrips, useCreateTrip } from '../hooks/useTrips'
import { useAppStore } from '../stores/appStore'
import CreateTripDialog from '../components/CreateTripDialog'

export default function TripList() {
    const userId = useAppStore((state) => state.userId)
    const setCurrentTripId = useAppStore((state) => state.setCurrentTripId)
    const [createDialogOpen, setCreateDialogOpen] = useState(false)

    const { data: trips, isLoading, error } = useTrips(userId)
    const createTripMutation = useCreateTrip()

    const handleCreateTrip = async (data: {
        name: string
        startDate: string
        endDate: string
    }) => {
        if (!userId) return

        await createTripMutation.mutateAsync({
            userId,
            name: data.name,
            startDate: data.startDate,
            endDate: data.endDate
        })

        setCreateDialogOpen(false)
    }

    if (isLoading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
                <CircularProgress />
            </Box>
        )
    }

    if (error) {
        return (
            <Container maxWidth="lg" sx={{ mt: 4 }}>
                <Alert severity="error">
                    Failed to load trips. Please try again later.
                </Alert>
            </Container>
        )
    }

    return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
                <Typography variant="h3" component="h1">
                    My Trips
                </Typography>
                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => setCreateDialogOpen(true)}
                >
                    New Trip
                </Button>
            </Box>

            {trips && trips.length === 0 ? (
                <Box textAlign="center" py={8}>
                    <Typography variant="h5" color="text.secondary" gutterBottom>
                        No trips yet
                    </Typography>
                    <Typography variant="body1" color="text.secondary" paragraph>
                        Create your first trip to get started!
                    </Typography>
                    <Button
                        variant="contained"
                        size="large"
                        startIcon={<AddIcon />}
                        onClick={() => setCreateDialogOpen(true)}
                    >
                        Create Trip
                    </Button>
                </Box>
            ) : (
                <Grid container spacing={3}>
                    {trips?.map((trip) => (
                        <Grid item xs={12} sm={6} md={4} key={trip.id}>
                            <Card>
                                <CardContent>
                                    <Typography variant="h6" gutterBottom>
                                        {trip.name}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary" gutterBottom>
                                        {new Date(trip.startDate).toLocaleDateString()} -{' '}
                                        {new Date(trip.endDate).toLocaleDateString()}
                                    </Typography>
                                    <Box mt={2}>
                                        {trip.isCompleted && (
                                            <Chip label="Completed" color="success" size="small" />
                                        )}
                                        {trip.days && (
                                            <Chip
                                                label={`${trip.days.length} days`}
                                                size="small"
                                                sx={{ ml: 1 }}
                                            />
                                        )}
                                    </Box>
                                </CardContent>
                                <CardActions>
                                    <Button
                                        size="small"
                                        onClick={() => setCurrentTripId(trip.id)}
                                    >
                                        View Details
                                    </Button>
                                </CardActions>
                            </Card>
                        </Grid>
                    ))}
                </Grid>
            )}

            <CreateTripDialog
                open={createDialogOpen}
                onClose={() => setCreateDialogOpen(false)}
                onSubmit={handleCreateTrip}
                isLoading={createTripMutation.isPending}
            />
        </Container>
    )
}
