import { Box, Card, CardContent, Typography, Grid, Chip } from "@mui/material"
import dayjs from "dayjs"
import { useMemo } from "react"

import { useLanguageStore } from "../stores/languageStore"
import type { TripDay } from "../types"

interface CalendarViewProps {
  days: TripDay[]
}

export const CalendarView = ({ days }: CalendarViewProps) => {
  const { t } = useLanguageStore()

  const daysWithCities = useMemo(() => {
    return days.map((day) => {
      const activeScenario = day.scenarios?.find((s) => s.isSelected)
      const activities = activeScenario ? activeScenario.activities || [] : day.activities || []

      const cities = Array.from(new Set(activities.map((a) => a.city).filter((city) => !!city)))

      return {
        ...day,
        cities,
      }
    })
  }, [days])

  return (
    <Box sx={{ p: 2, height: "100%", overflow: "auto" }}>
      <Typography variant="h5" gutterBottom sx={{ mb: 3, fontWeight: "bold" }}>
        {t("tripCalendar" as any) || "Trip Calendar"}
      </Typography>

      <Grid container spacing={2}>
        {daysWithCities.map((day) => (
          <Grid key={day.id} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
            <Card
              elevation={2}
              sx={{
                height: "100%",
                borderRadius: 2,
                transition: "transform 0.2s",
                "&:hover": { transform: "translateY(-4px)" },
                border: "1px solid",
                borderColor: "divider",
              }}
            >
              <CardContent>
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 2 }}>
                  <Box>
                    <Typography variant="subtitle2" color="primary" fontWeight="bold">
                      {day.name || `Day ${day.dayNumber || day.dayIndex! + 1}`}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {dayjs(day.date).format("MMM D, YYYY")}
                    </Typography>
                  </Box>
                  <Chip
                    label={dayjs(day.date).format("ddd")}
                    size="small"
                    variant="outlined"
                    sx={{ fontWeight: "bold" }}
                  />
                </Box>

                <Box sx={{ minHeight: 60 }}>
                  {day.cities.length > 0 ? (
                    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                      {day.cities.map((city) => (
                        <Chip key={city} label={city} size="small" color="secondary" variant="filled" />
                      ))}
                    </Box>
                  ) : (
                    <Typography variant="body2" color="text.disabled" sx={{ fontStyle: "italic" }}>
                      {t("noCitiesListed" as any) || "No cities listed"}
                    </Typography>
                  )}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  )
}
