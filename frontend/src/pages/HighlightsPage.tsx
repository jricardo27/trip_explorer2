import { Refresh as RefreshIcon, LocationOn as LocationIcon } from "@mui/icons-material"
import {
  Box,
  Container,
  IconButton,
  Paper,
  Tooltip,
  Typography,
  Alert,
  CircularProgress,
  Snackbar,
  Button,
  Tabs,
  Tab,
  Chip,
} from "@mui/material"
import { useState } from "react"

import { HighlightsMap } from "../components/HighlightsMap"
import { StatisticsCards } from "../components/StatisticsCards"
import { useHighlights, useRecalculateHighlights, usePopulateActivityLocations } from "../hooks/useHighlights"
import { useLanguageStore } from "../stores/languageStore"

type FilterView = "overview" | "countries" | "cities" | "trips" | "activityTypes"

export const HighlightsPage = () => {
  const { t } = useLanguageStore()
  const { data, isLoading, error } = useHighlights()
  const recalculateMutation = useRecalculateHighlights()
  const populateMutation = usePopulateActivityLocations()
  const [showSuccess, setShowSuccess] = useState(false)
  const [successMessage, setSuccessMessage] = useState("")
  const [filterView, setFilterView] = useState<FilterView>("overview")

  const handleRecalculate = () => {
    recalculateMutation.mutate(undefined, {
      onSuccess: () => {
        setSuccessMessage(t("statisticsRecalculated"))
        setShowSuccess(true)
      },
    })
  }

  const handlePopulateLocations = () => {
    populateMutation.mutate(undefined, {
      onSuccess: (data: any) => {
        setSuccessMessage(t("locationsPopulated").replace("{count}", data.updated.toString()))
        setShowSuccess(true)
      },
    })
  }

  const handleCloseSnackbar = () => {
    setShowSuccess(false)
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Box sx={{ display: "flex", alignItems: "center", mb: 3, gap: 2 }}>
        <Typography variant="h4" sx={{ flexGrow: 1 }}>
          {t("travelHighlights")}
        </Typography>
        <Button
          variant="outlined"
          startIcon={populateMutation.isPending ? <CircularProgress size={20} /> : <LocationIcon />}
          onClick={handlePopulateLocations}
          disabled={populateMutation.isPending}
          sx={{ mr: 1 }}
        >
          {t("populateLocations")}
        </Button>
        <Tooltip title={t("recalculateStatistics")}>
          <IconButton onClick={handleRecalculate} disabled={recalculateMutation.isPending}>
            {recalculateMutation.isPending ? <CircularProgress size={24} /> : <RefreshIcon />}
          </IconButton>
        </Tooltip>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {t("failedToLoadHighlights")}
        </Alert>
      )}

      {recalculateMutation.isError && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {t("failedToSave")}
        </Alert>
      )}

      {populateMutation.isError && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {t("failedToSave")}
        </Alert>
      )}

      <Box sx={{ mb: 3 }}>
        <StatisticsCards stats={data?.statistics} isLoading={isLoading} />
      </Box>

      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={filterView}
          onChange={(_, value) => setFilterView(value)}
          sx={{ borderBottom: 1, borderColor: "divider" }}
        >
          <Tab label={t("overview")} value="overview" />
          <Tab label={t("countries")} value="countries" />
          <Tab label={t("cities")} value="cities" />
          <Tab label={t("trips")} value="trips" />
          <Tab label={t("activityTypes")} value="activityTypes" />
        </Tabs>
      </Paper>

      {filterView === "overview" && (
        <Paper sx={{ height: 600, overflow: "hidden", mb: 3 }}>
          <HighlightsMap data={data} isLoading={isLoading} />
        </Paper>
      )}

      {filterView === "countries" && data && data.countries.length > 0 && (
        <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))" }}>
          {data.countries.map((visit) => (
            <Paper key={visit.id} sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                {visit.country.name}
              </Typography>
              <Box sx={{ display: "flex", gap: 1, mb: 1, flexWrap: "wrap" }}>
                <Chip label={`${visit.activityCount} ${t("activities").toLowerCase()}`} size="small" color="primary" />
                <Chip label={`${visit.visitCount} ${t("trips").toLowerCase()}`} size="small" />
                {visit.country.continent && <Chip label={visit.country.continent} size="small" variant="outlined" />}
              </Box>
              <Typography variant="caption" color="text.secondary" display="block">
                {t("firstVisit")}: {new Date(visit.firstVisit).toLocaleDateString()}
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block">
                {t("lastVisit")}: {new Date(visit.lastVisit).toLocaleDateString()}
              </Typography>
            </Paper>
          ))}
        </Box>
      )}

      {filterView === "cities" && data && data.cities.length > 0 && (
        <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))" }}>
          {data.cities.map((visit) => (
            <Paper key={visit.id} sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                {visit.city.name}
              </Typography>
              <Box sx={{ display: "flex", gap: 1, mb: 1, flexWrap: "wrap" }}>
                <Chip label={`${visit.activityCount} ${t("activities").toLowerCase()}`} size="small" color="primary" />
                <Chip label={`${visit.visitCount} ${t("trips").toLowerCase()}`} size="small" />
                <Chip label={visit.city.countryCode} size="small" variant="outlined" />
              </Box>
              <Typography variant="caption" color="text.secondary" display="block">
                {t("firstVisit")}: {new Date(visit.firstVisit).toLocaleDateString()}
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block">
                {t("lastVisit")}: {new Date(visit.lastVisit).toLocaleDateString()}
              </Typography>
              {visit.city.population && (
                <Typography variant="caption" color="text.secondary" display="block">
                  {t("population")}: {visit.city.population.toLocaleString()}
                </Typography>
              )}
            </Paper>
          ))}
        </Box>
      )}

      {filterView === "trips" && data && data.trips && data.trips.length > 0 && (
        <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: "repeat(auto-fill, minmax(350px, 1fr))" }}>
          {data.trips.map((trip) => (
            <Paper key={trip.id} sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                {trip.name}
              </Typography>
              <Box sx={{ display: "flex", gap: 1, mb: 1, flexWrap: "wrap" }}>
                <Chip label={`${trip.activityCount} ${t("activities").toLowerCase()}`} size="small" color="primary" />
              </Box>
              <Typography variant="caption" color="text.secondary" display="block">
                {new Date(trip.startDate).toLocaleDateString()} - {new Date(trip.endDate).toLocaleDateString()}
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block">
                {t("duration")}:{" "}
                {Math.ceil(
                  (new Date(trip.endDate).getTime() - new Date(trip.startDate).getTime()) / (1000 * 60 * 60 * 24),
                )}{" "}
                {t("days")}
              </Typography>
            </Paper>
          ))}
        </Box>
      )}

      {filterView === "activityTypes" && data && data.activityTypes && data.activityTypes.length > 0 && (
        <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))" }}>
          {data.activityTypes.map((activityType) => (
            <Paper key={activityType.type} sx={{ p: 3, textAlign: "center" }}>
              <Typography variant="h3" color="primary" gutterBottom>
                {activityType.count}
              </Typography>
              <Typography variant="h6" gutterBottom>
                {t(activityType.type as any)}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {((activityType.count / (data.statistics?.totalActivities || 1)) * 100).toFixed(1)}% {t("ofTotal")}
              </Typography>
            </Paper>
          ))}
        </Box>
      )}

      {filterView === "overview" && data && data.countries.length > 0 && (
        <Box sx={{ mt: 3 }}>
          <Typography variant="h6" gutterBottom>
            {t("topCountries")}
          </Typography>
          <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
            {data.countries.slice(0, 10).map((visit) => (
              <Paper
                key={visit.id}
                sx={{
                  p: 2,
                  minWidth: 200,
                  display: "flex",
                  flexDirection: "column",
                  gap: 0.5,
                }}
              >
                <Typography variant="subtitle1" sx={{ fontWeight: "bold" }}>
                  {visit.country.name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {visit.activityCount} {t("activities").toLowerCase()}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {visit.country.continent}
                </Typography>
              </Paper>
            ))}
          </Box>
        </Box>
      )}

      <Snackbar
        open={showSuccess}
        autoHideDuration={3000}
        onClose={handleCloseSnackbar}
        message={successMessage}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      />
    </Container>
  )
}
