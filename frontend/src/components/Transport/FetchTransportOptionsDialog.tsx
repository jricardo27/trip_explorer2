import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Typography,
  Box,
  Divider,
  CircularProgress,
  Alert,
} from "@mui/material"
import { DateTimePicker } from "@mui/x-date-pickers/DateTimePicker"
import dayjs, { Dayjs } from "dayjs"
import { useState, useEffect } from "react"

import { useLanguageStore } from "../../stores/languageStore"
import type { Activity } from "../../types"
import { getDistance } from "../../utils/geodesicUtils"

interface FetchTransportOptionsDialogProps {
  open: boolean
  onClose: () => void
  fromActivity: Activity
  toActivity: Activity
  onFetch: (options: { modes: string[]; departureTime?: number }) => Promise<void>
  isFetching: boolean
  fetchedCount?: number
}

export const FetchTransportOptionsDialog = ({
  open,
  onClose,
  fromActivity,
  toActivity,
  onFetch,
  isFetching,
  fetchedCount,
}: FetchTransportOptionsDialogProps) => {
  const { t } = useLanguageStore()

  // Calculate distance once to determine initial states
  const distance = getDistance(
    [fromActivity.latitude || 0, fromActivity.longitude || 0],
    [toActivity.latitude || 0, toActivity.longitude || 0],
  )

  const [modes, setModes] = useState<Record<string, boolean>>({
    transit: true,
    driving: false,
    walking: distance < 6000,
    bicycling: false,
  })
  const [departureTime, setDepartureTime] = useState<Dayjs | null>(
    fromActivity.scheduledEnd ? dayjs(fromActivity.scheduledEnd) : dayjs(),
  )
  const [trafficAware, setTrafficAware] = useState(true)
  const [showSuccess, setShowSuccess] = useState(false)
  const [wasFetching, setWasFetching] = useState(false)

  // Detect when fetching completes
  useEffect(() => {
    if (wasFetching && !isFetching) {
      setShowSuccess(true)
      const timer = setTimeout(() => {
        setShowSuccess(false)
        onClose()
      }, 1500)
      return () => clearTimeout(timer)
    }
    setWasFetching(isFetching)
  }, [isFetching, wasFetching, onClose])

  const handleModeChange = (mode: string) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setModes((prev) => ({ ...prev, [mode]: event.target.checked }))
  }

  const handleFetch = async () => {
    const selectedModes = Object.entries(modes)
      .filter(([, checked]) => checked)
      .map(([mode]) => mode)

    await onFetch({
      modes: selectedModes,
      departureTime: trafficAware && departureTime ? departureTime.unix() : undefined,
    })
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{t("fetchTransportOptions") || "Fetch Transport Options"}</DialogTitle>
      <DialogContent>
        {isFetching ? (
          <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", py: 4 }}>
            <CircularProgress size={48} />
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              {t("fetchingTransportOptions") || "Fetching transport options..."}
            </Typography>
          </Box>
        ) : showSuccess ? (
          <Box sx={{ py: 2 }}>
            <Alert severity="success">
              {t("transportOptionsFetched") || "Transport options fetched successfully!"}
              {fetchedCount !== undefined && ` (${fetchedCount} options)`}
            </Alert>
          </Box>
        ) : (
          <>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {t("fetchTransportDescription") || "Select the transport modes you'd like to check for this segment."}
            </Typography>

            <FormGroup>
              <FormControlLabel
                control={<Checkbox checked={modes.transit} onChange={handleModeChange("transit")} />}
                label={t("transit") || "Public Transport (Transit)"}
              />
              <FormControlLabel
                control={<Checkbox checked={modes.walking} onChange={handleModeChange("walking")} />}
                label={t("walking") || "Walking"}
              />
              <FormControlLabel
                control={<Checkbox checked={modes.driving} onChange={handleModeChange("driving")} />}
                label={t("driving") || "Driving"}
              />
              <FormControlLabel
                control={<Checkbox checked={modes.bicycling} onChange={handleModeChange("bicycling")} />}
                label={t("bicycling") || "Bicycling"}
              />
            </FormGroup>

            <Divider sx={{ my: 2 }} />

            <Box sx={{ mt: 1 }}>
              <FormControlLabel
                control={<Checkbox checked={trafficAware} onChange={(e) => setTrafficAware(e.target.checked)} />}
                label={t("trafficAware") || "Traffic and Schedule Aware"}
              />
              {trafficAware && (
                <Box sx={{ mt: 1, ml: 4 }}>
                  <DateTimePicker
                    label={t("departureTime") || "Departure Time"}
                    value={departureTime}
                    onChange={setDepartureTime}
                    slotProps={{ textField: { size: "small", fullWidth: true } }}
                  />
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: "block" }}>
                    {t("departureTimeHint") || "Defaults to previous activity's end time."}
                  </Typography>
                </Box>
              )}
            </Box>
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="inherit" disabled={isFetching}>
          {t("cancel")}
        </Button>
        {!isFetching && !showSuccess && (
          <Button onClick={handleFetch} variant="contained" disabled={!Object.values(modes).some((v) => v)}>
            {t("fetch") || "Fetch"}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  )
}
