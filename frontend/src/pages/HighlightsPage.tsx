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
  Chip,
} from "@mui/material"
import { useState } from "react"
import { useSearchParams } from "react-router-dom"

import { HighlightsMap } from "../components/HighlightsMap"
import { StatisticsCards } from "../components/StatisticsCards"
import { useHighlights, useRecalculateHighlights, usePopulateActivityLocations } from "../hooks/useHighlights"
import { useLanguageStore } from "../stores/languageStore"

type FilterView = "countries" | "cities" | "trips" | "activityTypes"

export const HighlightsPage = () => {
  const { t } = useLanguageStore()
  const { data, isLoading, error } = useHighlights()
  const recalculateMutation = useRecalculateHighlights()
  const populateMutation = usePopulateActivityLocations()
  const [showSuccess, setShowSuccess] = useState(false)
  const [successMessage, setSuccessMessage] = useState("")

  const [searchParams, setSearchParams] = useSearchParams()
  const filterView = (searchParams.get("view") as FilterView) || "countries"
  const selectedContextId = searchParams.get("context")

  const [highlightedId, setHighlightedId] = useState<string | null>(null)

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

  const handleItemClick = (id: string) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      next.set("context", id)
      return next
    })
    setHighlightedId(id)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const handleActivityClick = (id: string) => {
    setHighlightedId(id)
    // Don't scroll to top here, just zoom the map
  }

  const handleViewChange = (view: FilterView) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      if (view === "countries") {
        next.delete("view")
      } else {
        next.set("view", view)
      }
      next.delete("context")
      return next
    })
    setHighlightedId(null)
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

      {/* Map - Always Visible */}
      <Paper sx={{ height: 500, overflow: "hidden", mb: 4, borderRadius: 2, boxShadow: 3 }}>
        <HighlightsMap data={data} isLoading={isLoading} highlightedId={highlightedId} />
      </Paper>

      {/* Statistics Cards - Act as Tabs */}
      <Box sx={{ mb: 4 }}>
        <StatisticsCards
          stats={data?.statistics}
          isLoading={isLoading}
          activeView={filterView}
          onCardClick={handleViewChange}
        />
      </Box>

      {/* Detail Views */}
      <Box sx={{ mt: 2, mb: 4 }}>
        {filterView === "countries" && data && (
          <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))" }}>
            {data.countries.length > 0 ? (
              data.countries.map((visit) => (
                <Paper
                  key={visit.id}
                  onClick={() => handleItemClick(visit.country.code)}
                  sx={{
                    p: 2,
                    cursor: "pointer",
                    transition: "all 0.2s",
                    border: selectedContextId === visit.country.code ? "2px solid" : "1px solid",
                    borderColor: selectedContextId === visit.country.code ? "primary.main" : "divider",
                    boxShadow: selectedContextId === visit.country.code ? 4 : 1,
                    "&:hover": { boxShadow: 2, borderColor: "primary.light" },
                  }}
                >
                  <Typography variant="h6" gutterBottom>
                    {visit.country.name}
                  </Typography>
                  <Box sx={{ display: "flex", gap: 1, mb: 1, flexWrap: "wrap" }}>
                    <Chip
                      label={`${visit.activityCount} ${t("activities").toLowerCase()}`}
                      size="small"
                      color="primary"
                    />
                    <Chip label={`${visit.visitCount} ${t("trips").toLowerCase()}`} size="small" />
                    {visit.country.continent && (
                      <Chip label={visit.country.continent} size="small" variant="outlined" />
                    )}
                  </Box>
                  <Typography variant="caption" color="text.secondary" display="block">
                    {t("firstVisit")}: {new Date(visit.firstVisit).toLocaleDateString()}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" display="block">
                    {t("lastVisit")}: {new Date(visit.lastVisit).toLocaleDateString()}
                  </Typography>
                </Paper>
              ))
            ) : (
              <Typography color="text.secondary" sx={{ p: 2 }}>
                {t("noTravelData")}
              </Typography>
            )}
          </Box>
        )}

        {filterView === "cities" && data && (
          <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))" }}>
            {data.cities.length > 0 ? (
              data.cities.map((visit) => (
                <Paper
                  key={visit.id}
                  onClick={() => handleItemClick(visit.city.name)}
                  sx={{
                    p: 2,
                    cursor: "pointer",
                    transition: "all 0.2s",
                    border: selectedContextId === visit.city.name ? "2px solid" : "1px solid",
                    borderColor: selectedContextId === visit.city.name ? "primary.main" : "divider",
                    boxShadow: selectedContextId === visit.city.name ? 4 : 1,
                    "&:hover": { boxShadow: 2, borderColor: "primary.light" },
                  }}
                >
                  <Typography variant="h6" gutterBottom>
                    {visit.city.name}
                  </Typography>
                  <Box sx={{ display: "flex", gap: 1, mb: 1, flexWrap: "wrap" }}>
                    <Chip
                      label={`${visit.activityCount} ${t("activities").toLowerCase()}`}
                      size="small"
                      color="primary"
                    />
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
              ))
            ) : (
              <Typography color="text.secondary" sx={{ p: 2 }}>
                {t("noTravelData")}
              </Typography>
            )}
          </Box>
        )}

        {filterView === "trips" && data && (
          <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: "repeat(auto-fill, minmax(350px, 1fr))" }}>
            {data.trips.length > 0 ? (
              data.trips.map((trip) => (
                <Paper
                  key={trip.id}
                  onClick={() => handleItemClick(trip.id)}
                  sx={{
                    p: 2,
                    cursor: "pointer",
                    transition: "all 0.2s",
                    border: selectedContextId === trip.id ? "2px solid" : "1px solid",
                    borderColor: selectedContextId === trip.id ? "primary.main" : "divider",
                    boxShadow: selectedContextId === trip.id ? 4 : 1,
                    "&:hover": { boxShadow: 2, borderColor: "primary.light" },
                  }}
                >
                  <Typography variant="h6" gutterBottom>
                    {trip.name}
                  </Typography>
                  <Box sx={{ display: "flex", gap: 1, mb: 1, flexWrap: "wrap" }}>
                    <Chip
                      label={`${trip.activityCount} ${t("activities").toLowerCase()}`}
                      size="small"
                      color="primary"
                    />
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
              ))
            ) : (
              <Typography color="text.secondary" sx={{ p: 2 }}>
                {t("noTravelData")}
              </Typography>
            )}
          </Box>
        )}

        {filterView === "activityTypes" && data && (
          <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))" }}>
            {data.activityTypes.length > 0 ? (
              data.activityTypes.map((activityType) => (
                <Paper
                  key={activityType.type}
                  onClick={() => handleItemClick(activityType.type)}
                  sx={{
                    p: 3,
                    textAlign: "center",
                    cursor: "pointer",
                    transition: "all 0.2s",
                    border: selectedContextId === activityType.type ? "2px solid" : "1px solid",
                    borderColor: selectedContextId === activityType.type ? "primary.main" : "divider",
                    boxShadow: selectedContextId === activityType.type ? 4 : 1,
                    "&:hover": { boxShadow: 2, borderColor: "primary.light" },
                  }}
                >
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
              ))
            ) : (
              <Typography color="text.secondary" sx={{ p: 2 }}>
                {t("noTravelData")}
              </Typography>
            )}
          </Box>
        )}
      </Box>

      {/* Filtered Activities List */}
      {selectedContextId && data?.activities && (
        <Box sx={{ mt: 4 }}>
          <Typography variant="h5" gutterBottom sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            {t("activities")}
            <Chip
              label={
                data.activities.filter(
                  (a) =>
                    a.city === selectedContextId ||
                    a.countryCode === selectedContextId ||
                    a.tripId === selectedContextId ||
                    a.activityType === selectedContextId,
                ).length
              }
              size="small"
              color="primary"
            />
            <Button size="small" onClick={() => handleViewChange(filterView)}>
              {t("clear")}
            </Button>
          </Typography>
          <Box sx={{ display: "grid", gap: 1 }}>
            {data.activities
              .filter(
                (a) =>
                  a.city === selectedContextId ||
                  a.countryCode === selectedContextId ||
                  a.tripId === selectedContextId ||
                  a.activityType === selectedContextId,
              )
              .map((activity) => (
                <Paper
                  key={activity.id}
                  sx={{
                    p: 2,
                    display: "flex",
                    alignItems: "center",
                    gap: 2,
                    border: highlightedId === activity.id ? "2px solid" : "1px solid",
                    borderColor: highlightedId === activity.id ? "secondary.main" : "transparent",
                    bgcolor: highlightedId === activity.id ? "action.selected" : "background.paper",
                    "&:hover": { bgcolor: "action.hover" },
                    cursor: "pointer",
                  }}
                  onClick={() => handleActivityClick(activity.id)}
                >
                  <Box
                    sx={{
                      width: 12,
                      height: 12,
                      borderRadius: "50%",
                      bgcolor:
                        {
                          ACCOMMODATION: "#E91E63",
                          RESTAURANT: "#FF9800",
                          ATTRACTION: "#9C27B0",
                          TRANSPORT: "#2196F3",
                          FLIGHT: "#03A9F4",
                          ACTIVITY: "#4CAF50",
                          TOUR: "#8BC34A",
                          EVENT: "#FFC107",
                          LOCATION: "#795548",
                          CUSTOM: "#607D8B",
                        }[activity.activityType] || "#000",
                    }}
                  />
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="subtitle1" component="span">
                      {activity.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ ml: 2 }}>
                      {t(activity.activityType as any)}
                    </Typography>
                  </Box>
                  <Typography variant="caption" color="text.secondary">
                    {activity.city}
                    {activity.city && activity.countryCode ? ", " : ""}
                    {activity.countryCode}
                  </Typography>
                  <Typography variant="caption" sx={{ minWidth: 100, textAlign: "right" }}>
                    {activity.scheduledStart ? new Date(activity.scheduledStart).toLocaleDateString() : ""}
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
