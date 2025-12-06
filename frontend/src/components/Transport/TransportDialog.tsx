import { useState } from "react"
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    List,
    ListItem,
    ListItemText,
    ListItemIcon,
    IconButton,
    TextField,
    MenuItem,
    Grid,
    Typography,
    Box,
    Radio,
} from "@mui/material"
import { Delete as DeleteIcon, DirectionsCar, DirectionsBus, DirectionsWalk, Train, Flight, DirectionsBoat, PedalBike, HelpOutline } from "@mui/icons-material"
import { TransportMode } from "../../types"
import type { TransportAlternative } from "../../types"
import { transportApi } from "../../api/client"
import { useMutation, useQueryClient } from "@tanstack/react-query"

interface TransportDialogProps {
    open: boolean
    onClose: () => void
    tripId: string
    fromActivityId: string
    toActivityId: string
    alternatives: TransportAlternative[]
}

const getIcon = (mode: TransportMode) => {
    switch (mode) {
        case TransportMode.DRIVING: return <DirectionsCar />
        case TransportMode.WALKING: return <DirectionsWalk />
        case TransportMode.CYCLING: return <PedalBike />
        case TransportMode.TRANSIT: return <DirectionsBus /> // Generic transit
        case TransportMode.BUS: return <DirectionsBus />
        case TransportMode.TRAIN: return <Train />
        case TransportMode.FLIGHT: return <Flight />
        case TransportMode.FERRY: return <DirectionsBoat />
        default: return <HelpOutline />
    }
}

export const TransportDialog = ({ open, onClose, tripId, fromActivityId, toActivityId, alternatives }: TransportDialogProps) => {
    const queryClient = useQueryClient()
    const [newMode, setNewMode] = useState<TransportMode>(TransportMode.DRIVING)
    const [newDuration, setNewDuration] = useState<string>("")
    const [newCost, setNewCost] = useState<string>("")
    const [isAdding, setIsAdding] = useState(false)

    const createMutation = useMutation({
        mutationFn: transportApi.create,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["trips", tripId] })
            setIsAdding(false)
            setNewDuration("")
            setNewCost("")
        },
    })

    const selectMutation = useMutation({
        mutationFn: transportApi.select,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["trips", tripId] })
        },
    })

    const deleteMutation = useMutation({
        mutationFn: transportApi.delete,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["trips", tripId] })
        },
    })

    const handleAdd = () => {
        createMutation.mutate({
            tripId,
            fromActivityId,
            toActivityId,
            transportMode: newMode,
            durationMinutes: parseInt(newDuration) || 0,
            cost: newCost ? parseFloat(newCost) : undefined,
        })
    }

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>Transport Options</DialogTitle>
            <DialogContent>
                <List>
                    {alternatives.map((alt) => (
                        <ListItem
                            key={alt.id}
                            secondaryAction={
                                <IconButton edge="end" onClick={() => deleteMutation.mutate(alt.id)}>
                                    <DeleteIcon />
                                </IconButton>
                            }
                        >
                            <ListItemIcon onClick={() => selectMutation.mutate(alt.id)} style={{ cursor: 'pointer' }}>
                                <Radio checked={alt.isSelected} />
                            </ListItemIcon>
                            <ListItemIcon>
                                {getIcon(alt.transportMode)}
                            </ListItemIcon>
                            <ListItemText
                                primary={alt.name || alt.transportMode}
                                secondary={`${alt.durationMinutes} min • ${alt.cost ? `$${alt.cost}` : 'Free'}`}
                            />
                        </ListItem>
                    ))}
                    {alternatives.length === 0 && !isAdding && (
                        <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 2 }}>
                            No transport options added yet.
                        </Typography>
                    )}
                </List>

                {isAdding ? (
                    <Box sx={{ mt: 2, p: 2, border: '1px solid #eee', borderRadius: 1 }}>
                        <Grid container spacing={2}>
                            <Grid size={12}>
                                <TextField
                                    select
                                    label="Mode"
                                    fullWidth
                                    value={newMode}
                                    onChange={(e) => setNewMode(e.target.value as TransportMode)}
                                >
                                    {Object.values(TransportMode).map((mode) => (
                                        <MenuItem key={mode} value={mode}>
                                            {mode}
                                        </MenuItem>
                                    ))}
                                </TextField>
                            </Grid>
                            <Grid size={6}>
                                <TextField
                                    label="Duration (min)"
                                    type="number"
                                    fullWidth
                                    value={newDuration}
                                    onChange={(e) => setNewDuration(e.target.value)}
                                />
                            </Grid>
                            <Grid size={6}>
                                <TextField
                                    label="Cost"
                                    type="number"
                                    fullWidth
                                    value={newCost}
                                    onChange={(e) => setNewCost(e.target.value)}
                                />
                            </Grid>
                            <Grid size={12} container justifyContent="flex-end" spacing={1}>
                                <Button onClick={() => setIsAdding(false)}>Cancel</Button>
                                <Button variant="contained" onClick={handleAdd} disabled={createMutation.isPending}>
                                    Add
                                </Button>
                            </Grid>
                        </Grid>
                    </Box>
                ) : (
                    <Button fullWidth variant="outlined" sx={{ mt: 1 }} onClick={() => setIsAdding(true)}>
                        Add Option
                    </Button>
                )}

            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Close</Button>
            </DialogActions>
        </Dialog>
    )
}
