import {
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Chip,
  Checkbox,
  ListItemText,
  Typography,
} from "@mui/material"
import { DateTimePicker } from "@mui/x-date-pickers"
import dayjs from "dayjs"

import { useLanguageStore } from "../../stores/languageStore"

const DAYS_OF_WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

interface ActivityDateTimeFieldsProps {
  scheduledStart: dayjs.Dayjs | null
  setScheduledStart: (date: dayjs.Dayjs | null) => void
  scheduledEnd: dayjs.Dayjs | null
  setScheduledEnd: (date: dayjs.Dayjs | null) => void
  availableDays: string[]
  setAvailableDays: (days: string[]) => void
  tripStartDate?: string
  tripEndDate?: string
  canEdit: boolean
}

export const ActivityDateTimeFields = ({
  scheduledStart,
  setScheduledStart,
  scheduledEnd,
  setScheduledEnd,
  availableDays,
  setAvailableDays,
  tripStartDate,
  tripEndDate,
  canEdit,
}: ActivityDateTimeFieldsProps) => {
  const { t } = useLanguageStore()

  return (
    <>
      <Grid size={{ xs: 6 }}>
        <DateTimePicker
          label={t("startTime")}
          value={scheduledStart}
          minDate={tripStartDate ? dayjs(tripStartDate) : undefined}
          maxDate={tripEndDate ? dayjs(tripEndDate) : undefined}
          onChange={(newValue: any) => setScheduledStart(newValue)}
          slotProps={{ textField: { fullWidth: true } }}
          disabled={!canEdit}
        />
      </Grid>
      <Grid size={{ xs: 6 }}>
        <DateTimePicker
          label={t("endTime")}
          value={scheduledEnd}
          minDate={tripStartDate ? dayjs(tripStartDate) : undefined}
          maxDate={tripEndDate ? dayjs(tripEndDate) : undefined}
          onChange={(newValue: any) => setScheduledEnd(newValue)}
          slotProps={{ textField: { fullWidth: true } }}
          disabled={!canEdit}
        />
      </Grid>
      <Grid size={{ xs: 12 }}>
        <FormControl fullWidth disabled={!canEdit}>
          <InputLabel>{t("availableDays")}</InputLabel>
          <Select
            multiple
            value={availableDays}
            label={t("availableDays")}
            onChange={(e) =>
              setAvailableDays(
                typeof e.target.value === "string" ? e.target.value.split(",") : (e.target.value as string[]),
              )
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
    </>
  )
}
