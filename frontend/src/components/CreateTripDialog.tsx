import { useState } from 'react'
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    Box
} from '@mui/material'

interface CreateTripDialogProps {
    open: boolean
    onClose: () => void
    onSubmit: (data: { name: string; startDate: string; endDate: string }) => void
    isLoading?: boolean
}

export default function CreateTripDialog({
    open,
    onClose,
    onSubmit,
    isLoading
}: CreateTripDialogProps) {
    const [name, setName] = useState('')
    const [startDate, setStartDate] = useState('')
    const [endDate, setEndDate] = useState('')

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        onSubmit({ name, startDate, endDate })
        setName('')
        setStartDate('')
        setEndDate('')
    }

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <form onSubmit={handleSubmit}>
                <DialogTitle>Create New Trip</DialogTitle>
                <DialogContent>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                        <TextField
                            label="Trip Name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                            fullWidth
                            autoFocus
                        />
                        <TextField
                            label="Start Date"
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            required
                            fullWidth
                            InputLabelProps={{ shrink: true }}
                        />
                        <TextField
                            label="End Date"
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            required
                            fullWidth
                            InputLabelProps={{ shrink: true }}
                        />
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={onClose} disabled={isLoading}>
                        Cancel
                    </Button>
                    <Button type="submit" variant="contained" disabled={isLoading}>
                        Create
                    </Button>
                </DialogActions>
            </form>
        </Dialog>
    )
}
