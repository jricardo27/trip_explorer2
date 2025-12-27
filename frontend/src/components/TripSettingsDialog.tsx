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
import { useState, useEffect, useRef } from "react"

import client from "../api/client"
import { useShiftTrip } from "../hooks/useTrips"
import { useLanguageStore } from "../stores/languageStore"
import type { Trip } from "../types"

interface TripSettingsDialogProps {
  open: boolean
  onClose: () => void
  trip: Trip
  onUpdate: (data: Partial<Trip>) => Promise<unknown>
  isUpdating?: boolean
  fullScreen?: boolean
}

const COMMON_CURRENCIES = ["AUD", "USD", "EUR", "GBP", "JPY", "CAD", "NZD", "SGD", "CHF", "CNY"]

export const TripSettingsDialog = ({
  open,
  onClose,
  trip,
  onUpdate,
  isUpdating = false,
  fullScreen,
}: TripSettingsDialogProps) => {
  const { t } = useLanguageStore()
  const [name, setName] = useState(trip.name)
  const [startDate, setStartDate] = useState<Dayjs | null>(dayjs(trip.startDate))
  const [endDate, setEndDate] = useState<Dayjs | null>(dayjs(trip.endDate))
  const [budget, setBudget] = useState(trip.budget?.toString() || "")
  const [currencies, setCurrencies] = useState<string[]>(trip.currencies || ["AUD"])
  const [defaultCurrency, setDefaultCurrency] = useState(trip.defaultCurrency || "AUD")
  const [exchangeRates, setExchangeRates] = useState<Record<string, number>>(trip.exchangeRates || {})
  const [isCompleted, setIsCompleted] = useState(trip.isCompleted || false)
  const [isPublic, setIsPublic] = useState(trip.isPublic || false)
  const [publicLangEs, setPublicLangEs] = useState(false)

  // Shift state
  const [shiftDays, setShiftDays] = useState("")
  const shiftTripMutation = useShiftTrip()

  // Track previous open state to only reset when dialog opens (not on every render)
  const prevOpenRef = useRef(open)

  useEffect(() => {
    // Only reset form state when dialog transitions from closed to open
    if (open && !prevOpenRef.current) {
      setName(trip.name)
      setStartDate(dayjs(trip.startDate))
      setEndDate(dayjs(trip.endDate))
      setBudget(trip.budget?.toString() || "")
      setDefaultCurrency(trip.defaultCurrency || "AUD")
      setCurrencies(trip.currencies || ["AUD"])
      setExchangeRates(trip.exchangeRates || {})
      setIsCompleted(trip.isCompleted || false)
      setIsPublic(trip.isPublic || false)
    }
    prevOpenRef.current = open
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

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
          {t("tripSettings")}
          {fullScreen && (
            <IconButton onClick={onClose} size="small">
              <CloseIcon />
            </IconButton>
          )}
        </Box>
      </DialogTitle>
      <DialogContent>
        <Box display="flex" flexDirection="column" gap={3} pt={1}>
          <TextField label={t("tripName")} fullWidth value={name} onChange={(e) => setName(e.target.value)} />

          <Box display="flex" gap={2}>
            <DatePicker
              label={t("startDate")}
              value={startDate}
              onChange={setStartDate}
              slotProps={{ textField: { fullWidth: true } }}
            />
            <DatePicker
              label={t("endDate")}
              value={endDate}
              onChange={setEndDate}
              slotProps={{ textField: { fullWidth: true } }}
            />
          </Box>

          <Box display="flex" gap={2}>
            <TextField
              label={t("budget")}
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
              renderInput={(params) => <TextField {...params} label={t("defaultCurrency")} />}
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
                label={t("tripCurrencies")}
                placeholder={t("currencyPlaceholder")}
                helperText={t("currencyHelperText")}
              />
            )}
          />

          {currencies.filter((c) => c !== defaultCurrency).length > 0 && (
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                {t("exchangeRates").replace("{defaultCurrency}", defaultCurrency)}
              </Typography>
              <Box display="flex" flexDirection="column" gap={2}>
                {currencies
                  .filter((c) => c !== defaultCurrency)
                  .map((currency) => (
                    <TextField
                      key={currency}
                      label={t("oneCurrencyIn")
                        .replace("{currency}", currency)
                        .replace("{defaultCurrency}", defaultCurrency)}
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
                      inputProps={{
                        step: "any",
                        min: 0,
                      }}
                    />
                  ))}
              </Box>
            </Box>
          )}

          <Box display="flex" gap={4}>
            <Tooltip title={t("completedTooltip")} placement="top">
              <FormControlLabel
                control={<Switch checked={isCompleted} onChange={(e) => setIsCompleted(e.target.checked)} />}
                label={t("completed")}
              />
            </Tooltip>
            <Tooltip title={t("publicTooltip")} placement="top">
              <FormControlLabel
                control={<Switch checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} />}
                label={t("publicTrip")}
              />
            </Tooltip>
          </Box>

          {isPublic && trip.publicToken && (
            <Box sx={{ p: 2, bgcolor: "info.light", borderRadius: 1, color: "info.contrastText" }}>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Typography variant="subtitle2" fontWeight="bold">
                  {t("publicSharingLink") || "Shareable Timeline Link"}:
                </Typography>
                <FormControlLabel
                  control={
                    <Switch size="small" checked={publicLangEs} onChange={(e) => setPublicLangEs(e.target.checked)} />
                  }
                  label={<Typography variant="caption">Español (lang=es)</Typography>}
                />
              </Box>
              <Typography variant="body2" sx={{ wordBreak: "break-all", mt: 0.5 }}>
                {`${window.location.origin}/public/trip/${trip.publicToken}${publicLangEs ? "?lang=es" : ""}`}
              </Typography>
              <Button
                size="small"
                variant="contained"
                sx={{ mt: 1, bgcolor: "white", color: "info.main", "&:hover": { bgcolor: "#eee" } }}
                onClick={() => {
                  const url = `${window.location.origin}/public/trip/${trip.publicToken}${publicLangEs ? "?lang=es" : ""}`
                  navigator.clipboard.writeText(url)
                  alert(t("linkCopied") || "Link copied to clipboard!")
                }}
              >
                {t("copyLink") || "Copy Link"}
              </Button>
            </Box>
          )}

          <Box
            sx={{ mt: 1, p: 2, border: "1px solid", borderColor: "divider", borderRadius: 1, bgcolor: "action.hover" }}
          >
            <Typography variant="subtitle2" gutterBottom fontWeight="bold">
              {t("shiftTimeline")}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {t("shiftDescription")}
            </Typography>
            <Box display="flex" gap={2} alignItems="center">
              <TextField
                type="number"
                label={t("daysToShift")}
                size="small"
                value={shiftDays}
                onChange={(e) => setShiftDays(e.target.value)}
                sx={{ width: 120 }}
                placeholder={t("shiftPlaceholder")}
              />
              <Button
                variant="outlined"
                color="warning"
                onClick={handleShift}
                disabled={!shiftDays || shiftDays === "0" || shiftTripMutation.isPending}
              >
                {shiftTripMutation.isPending ? t("shifting") : t("shiftButton")}
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
              alert(t("exportFailed"))
            }
          }}
        >
          {t("exportJson")}
        </Button>
        <Box>
          <Button onClick={onClose} sx={{ mr: 1 }}>
            {t("cancel")}
          </Button>
          <Button onClick={handleSave} variant="contained" disabled={!name || !startDate || !endDate || isUpdating}>
            {isUpdating ? t("saving") : t("saveChanges")}
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
  )
}
