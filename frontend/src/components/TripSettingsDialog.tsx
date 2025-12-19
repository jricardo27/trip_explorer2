import { Close as CloseIcon } from "@mui/icons-material"
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
  Chip,
  FormControlLabel,
  Switch,
  IconButton,
  Tooltip,
} from "@mui/material"
import { DatePicker } from "@mui/x-date-pickers/DatePicker"
import dayjs, { Dayjs } from "dayjs"
import { saveAs } from "file-saver"
import { useState, useEffect } from "react"

import client from "../api/client"
import { useShiftTrip } from "../hooks/useTrips"
import type { Trip } from "../types"

interface TripSettingsDialogProps {
  open: boolean
  onClose: () => void
  trip: Trip
  onUpdate: (data: Partial<Trip>) => Promise<unknown>
  fullScreen?: boolean
}

const COMMON_CURRENCIES = ["AUD", "USD", "EUR", "GBP", "JPY", "CAD", "NZD", "SGD", "CHF", "CNY"]

export const TripSettingsDialog = ({ open, onClose, trip, onUpdate, fullScreen }: TripSettingsDialogProps) => {
  const [name, setName] = useState(trip.name)
  const [startDate, setStartDate] = useState<Dayjs | null>(dayjs(trip.startDate))
  const [endDate, setEndDate] = useState<Dayjs | null>(dayjs(trip.endDate))
  const [budget, setBudget] = useState(trip.budget?.toString() || "")
  const [currencies, setCurrencies] = useState<string[]>(trip.currencies || ["AUD"])
  const [defaultCurrency, setDefaultCurrency] = useState(trip.defaultCurrency || "AUD")
  const [exchangeRates, setExchangeRates] = useState<Record<string, number>>(trip.exchangeRates || {})
  const [isCompleted, setIsCompleted] = useState(trip.isCompleted || false)
  const [isPublic, setIsPublic] = useState(trip.isPublic || false)

  // Shift state
  const [shiftDays, setShiftDays] = useState("")
  const shiftTripMutation = useShiftTrip()

  useEffect(() => {
    if (open) {
      setTimeout(() => {
        setName(trip.name)
        setStartDate(dayjs(trip.startDate))
        setEndDate(dayjs(trip.endDate))
        setBudget(trip.budget?.toString() || "")
        setDefaultCurrency(trip.defaultCurrency || "AUD")
        setCurrencies(trip.currencies || ["AUD"])
        setExchangeRates(trip.exchangeRates || {})
        setIsCompleted(trip.isCompleted || false)
        setIsPublic(trip.isPublic || false)
      }, 0)
    }
  }, [open, trip])

  const handleSave = async () => {
    // Aggressively ensure all exchange rates are finite positive numbers before sending to backend
    const numericExchangeRates: Record<string, number> = {}
    Object.entries(exchangeRates).forEach(([key, value]) => {
      // Ensure we have a number. If it's a string from TextField, parse it.
      const n = typeof value === "string" ? parseFloat(value) : Number(value)
      if (!isNaN(n) && isFinite(n) && n > 0) {
        numericExchangeRates[key] = n
      } else {
        // If invalid or zero/negative, skip it or default to 1 (but skip is safer if it's optional)
        // numericExchangeRates[key] = 1
      }
    })

    const parsedBudget = budget ? parseFloat(budget) : undefined

    const payload = {
      name: name.trim(),
      startDate: startDate?.toISOString(),
      endDate: endDate?.toISOString(),
      budget: parsedBudget && parsedBudget > 0 ? parsedBudget : undefined,
      currencies,
      defaultCurrency,
      exchangeRates: numericExchangeRates,
      isCompleted,
      isPublic,
    }

    console.log("Trip update payload:", JSON.stringify(payload, null, 2))

    try {
      await onUpdate(payload)
      onClose()
    } catch (err: any) {
      const errorData = err.response?.data
      console.error("Trip update failed:", errorData || err.message)

      const errorMessage = errorData?.error?.message || errorData?.message || err.message
      const details = errorData?.error?.details ? `\n\nDetails: ${JSON.stringify(errorData.error.details)}` : ""
      alert(`Failed to update trip: ${errorMessage}${details}`)
    }
  }

  const handleShift = async () => {
    const days = parseInt(shiftDays)
    if (isNaN(days) || days === 0) return

    if (
      window.confirm(
        `Are you sure you want to shift the entire trip by ${days} days? This affects all days, activities, and recorded expenses.`,
      )
    ) {
      try {
        await shiftTripMutation.mutateAsync({ tripId: trip.id, days })
        setShiftDays("")
        onClose()
      } catch (err: any) {
        alert("Failed to shift trip: " + err.message)
      }
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth fullScreen={fullScreen}>
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          Trip Settings
          {fullScreen && (
            <IconButton onClick={onClose} size="small">
              <CloseIcon />
            </IconButton>
          )}
        </Box>
      </DialogTitle>
      <DialogContent>
        <Box display="flex" flexDirection="column" gap={3} pt={1}>
          <TextField label="Trip Name" fullWidth value={name} onChange={(e) => setName(e.target.value)} />

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
                startAdornment: (
                  <Typography color="text.secondary" mr={1}>
                    {defaultCurrency}
                  </Typography>
                ),
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
              value.map((option: string, index: number) => {
                const { key, ...tagProps } = getTagProps({ index })
                return <Chip key={key} variant="outlined" label={option} {...tagProps} />
              })
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

          {currencies.filter((c) => c !== defaultCurrency).length > 0 && (
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Exchange Rates (1 Foreign = ? {defaultCurrency})
              </Typography>
              <Box display="flex" flexDirection="column" gap={2}>
                {currencies
                  .filter((c) => c !== defaultCurrency)
                  .map((currency) => (
                    <TextField
                      key={currency}
                      label={`1 ${currency} in ${defaultCurrency}`}
                      type="number"
                      size="small"
                      fullWidth
                      value={exchangeRates[currency] || ""}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value)
                        setExchangeRates({
                          ...exchangeRates,
                          [currency]: isNaN(val) ? 1 : val,
                        })
                      }}
                    />
                  ))}
              </Box>
            </Box>
          )}

          <Box display="flex" gap={4}>
            <Tooltip title="Mark this trip as completed to archive it from your active trips list" placement="top">
              <FormControlLabel
                control={<Switch checked={isCompleted} onChange={(e) => setIsCompleted(e.target.checked)} />}
                label="Completed (Archive)"
              />
            </Tooltip>
            <Tooltip
              title="Make this trip visible to other users. Anyone with the link can view trip details, but cannot edit."
              placement="top"
            >
              <FormControlLabel
                control={<Switch checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} />}
                label="Public Trip"
              />
            </Tooltip>
          </Box>

          <Box
            sx={{ mt: 1, p: 2, border: "1px solid", borderColor: "divider", borderRadius: 1, bgcolor: "action.hover" }}
          >
            <Typography variant="subtitle2" gutterBottom fontWeight="bold">
              Shift Timeline
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Move all activities, days, and recorded expenses forward or backward by a specific number of days.
            </Typography>
            <Box display="flex" gap={2} alignItems="center">
              <TextField
                type="number"
                label="Days to Shift"
                size="small"
                value={shiftDays}
                onChange={(e) => setShiftDays(e.target.value)}
                sx={{ width: 120 }}
                placeholder="e.g. 7 or -3"
              />
              <Button
                variant="outlined"
                color="warning"
                onClick={handleShift}
                disabled={!shiftDays || shiftDays === "0" || shiftTripMutation.isPending}
              >
                {shiftTripMutation.isPending ? "Shifting..." : "Shift All Dates"}
              </Button>
            </Box>
          </Box>
        </Box>
      </DialogContent>
      <DialogActions sx={{ justifyContent: "space-between", px: 3, pb: 2 }}>
        <Button
          color="inherit"
          onClick={async () => {
            try {
              const res = await client.get(`/trips/${trip.id}/export`)
              const blob = new Blob([JSON.stringify(res.data.data, null, 2)], { type: "application/json" })
              saveAs(blob, `trip_${trip.name.replace(/\s+/g, "_")}_export.json`)
            } catch {
              alert("Export failed")
            }
          }}
        >
          Export JSON
        </Button>
        <Box>
          <Button onClick={onClose} sx={{ mr: 1 }}>
            Cancel
          </Button>
          <Button onClick={handleSave} variant="contained" disabled={!name || !startDate || !endDate}>
            Save Changes
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
  )
}
