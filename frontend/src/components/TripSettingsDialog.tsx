import { useState, useEffect } from "react"
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    Box,
    Typography,
    Autocomplete,
    Chip
} from "@mui/material"
import { DatePicker } from "@mui/x-date-pickers/DatePicker"
import dayjs, { Dayjs } from "dayjs"
import type { Trip } from "../types"
import { saveAs } from "file-saver"
import client from "../api/client"

interface TripSettingsDialogProps {
    open: boolean
    onClose: () => void
    trip: Trip
    onUpdate: (data: Partial<Trip>) => Promise<unknown>
}

const COMMON_CURRENCIES = ["AUD", "USD", "EUR", "GBP", "JPY", "CAD", "NZD", "SGD", "CHF", "CNY"]

export const TripSettingsDialog = ({ open, onClose, trip, onUpdate }: TripSettingsDialogProps) => {
    const [name, setName] = useState(trip.name)
    const [startDate, setStartDate] = useState<Dayjs | null>(dayjs(trip.startDate))
    const [endDate, setEndDate] = useState<Dayjs | null>(dayjs(trip.endDate))
    const [budget, setBudget] = useState(trip.budget?.toString() || "")
    const [currencies, setCurrencies] = useState<string[]>(trip.currencies || ["AUD"])
    const [defaultCurrency, setDefaultCurrency] = useState(trip.defaultCurrency || "AUD")
    const [exchangeRates, setExchangeRates] = useState<Record<string, number>>(trip.exchangeRates || {})

    useEffect(() => {
        if (open) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setName(trip.name)
            setStartDate(dayjs(trip.startDate))
            setEndDate(dayjs(trip.endDate))
            setBudget(trip.budget?.toString() || "")
            setCurrencies(trip.currencies || ["AUD"])
            setDefaultCurrency(trip.defaultCurrency || "AUD")
            setExchangeRates(trip.exchangeRates || {})
        }
    }, [open, trip])

    const handleSave = async () => {
        await onUpdate({
            name,
            startDate: startDate?.toISOString(),
            endDate: endDate?.toISOString(),
            budget: budget ? parseFloat(budget) : undefined,
            currencies,
            defaultCurrency,
            exchangeRates
        })
        onClose()
    }

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>Trip Settings</DialogTitle>
            <DialogContent>
                <Box display="flex" flexDirection="column" gap={3} pt={1}>
                    <TextField
                        label="Trip Name"
                        fullWidth
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                    />

                    <Box display="flex" gap={2}>
                        <DatePicker
                            label="Start Date"
                            value={startDate}
                            onChange={setStartDate}
                            slotProps={{ textField: { fullWidth: true } }}
                        />
                        <DatePicker
                            label="End Date"
                            value={endDate}
                            onChange={setEndDate}
                            slotProps={{ textField: { fullWidth: true } }}
                        />
                    </Box>

                    <Box display="flex" gap={2}>
                        <TextField
                            label="Budget"
                            type="number"
                            fullWidth
                            value={budget}
                            onChange={(e) => setBudget(e.target.value)}
                            InputProps={{
                                startAdornment: <Typography color="text.secondary" mr={1}>{defaultCurrency}</Typography>
                            }}
                        />
                        <Autocomplete
                            options={currencies}
                            getOptionLabel={(option) => option}
                            disableClearable
                            value={defaultCurrency}
                            onChange={(_, newValue) => setDefaultCurrency(newValue)}
                            renderInput={(params) => <TextField {...params} label="Default Currency" />}
                            sx={{ minWidth: 150 }}
                        />
                    </Box>

                    <Autocomplete
                        multiple
                        options={COMMON_CURRENCIES}
                        freeSolo
                        value={currencies}
                        onChange={(_, newValue) => setCurrencies(newValue)}
                        renderTags={(value: readonly string[], getTagProps) =>
                            value.map((option: string, index: number) => (
                                <Chip variant="outlined" label={option} {...getTagProps({ index })} />
                            ))
                        }
                        renderInput={(params) => (
                            <TextField
                                {...params}
                                label="Trip Currencies"
                                placeholder="Add currency"
                                helperText="Currencies available for expenses"
                            />
                        )}
                    />

                    {currencies.filter(c => c !== defaultCurrency).length > 0 && (
                        <Box>
                            <Typography variant="subtitle2" gutterBottom>Exchange Rates (1 Foreign = ? {defaultCurrency})</Typography>
                            <Box display="flex" flexDirection="column" gap={2}>
                                {currencies.filter(c => c !== defaultCurrency).map(currency => (
                                    <TextField
                                        key={currency}
                                        label={`1 ${currency} in ${defaultCurrency}`}
                                        type="number"
                                        size="small"
                                        fullWidth
                                        value={exchangeRates[currency] || ""}
                                        onChange={(e) => setExchangeRates({
                                            ...exchangeRates,
                                            [currency]: parseFloat(e.target.value)
                                        })}
                                    />
                                ))}
                            </Box>
                        </Box>
                    )}
                </Box>
            </DialogContent>
            <DialogActions sx={{ justifyContent: "space-between", px: 3, pb: 2 }}>
                <Button
                    color="inherit"
                    onClick={async () => {
                        try {
                            const res = await client.get(`/trips/${trip.id}/export`)
                            const blob = new Blob([JSON.stringify(res.data.data, null, 2)], { type: "application/json" })
                            saveAs(blob, `trip_${trip.name.replace(/\s+/g, '_')}_export.json`)
                        } catch (e) {
                            alert("Export failed")
                        }
                    }}
                >
                    Export JSON
                </Button>
                <Box>
                    <Button onClick={onClose} sx={{ mr: 1 }}>Cancel</Button>
                    <Button onClick={handleSave} variant="contained" disabled={!name || !startDate || !endDate}>
                        Save Changes
                    </Button>
                </Box>
            </DialogActions>
        </Dialog>
    )
}
