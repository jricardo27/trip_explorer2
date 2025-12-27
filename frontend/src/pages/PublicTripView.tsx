import { Box, CircularProgress, Alert, Typography, Tabs, Tab, Container, Paper } from "@mui/material"
import { useQuery } from "@tanstack/react-query"
import { useState, useMemo, useEffect } from "react"
import { useSearchParams, useParams } from "react-router-dom"

import { tripApi } from "../api/client"
import ActivityDialog from "../components/ActivityDialog"
import { CalendarView } from "../components/CalendarView"
import { TimelineCalendarView } from "../components/TimelineCalendarView"
import { TransportSelectionDialog } from "../components/Transport/TransportDialogs"
import { TripMap } from "../components/TripMap"
import { useLanguageStore } from "../stores/languageStore"

const PublicTripView = () => {
  const { token } = useParams<{ token: string }>()
  const [searchParams] = useSearchParams()
  const { t, setLanguage } = useLanguageStore()
  const [viewMode, setViewMode] = useState("timeline")

  // Allow setting language via query param
  useEffect(() => {
    const lang = searchParams.get("lang") || searchParams.get("lng")
    if (lang === "es" || lang === "en") {
      setLanguage(lang as any)
    }
  }, [searchParams, setLanguage])

  const {
    data: trip,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["public-trip", token],
    queryFn: () => tripApi.getPublic(token!),
    enabled: !!token,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingActivity, setEditingActivity] = useState<any>(null)
  const [transportDialogOpen, setTransportDialogOpen] = useState(false)
  const [selectedTransport, setSelectedTransport] = useState<any>(null)

  const allActivities = useMemo(() => {
    if (!trip || !trip.days) return []
    return trip.days.flatMap((day: any) => {
      // Include both main activities and active scenario activities
      const mainActivities = day.activities || []
      return mainActivities
    })
  }, [trip])

  const handleActivityClick = (activity: any) => {
    setEditingActivity(activity)
    setDialogOpen(true)
  }

  const handleTransportClick = (transport: any) => {
    setSelectedTransport(transport)
    setTransportDialogOpen(true)
  }

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="100vh">
        <CircularProgress />
      </Box>
    )
  }

  if (error || !trip) {
    return (
      <Container maxWidth="sm" sx={{ mt: 8 }}>
        <Alert severity="error">
          {t("failedToLoadPublicTrip") ||
            "Failed to load public trip. The link might be expired, invalid, or the trip is no longer public."}
        </Alert>
      </Container>
    )
  }

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
      <Paper
        elevation={1}
        sx={{ py: 3, mb: 3, borderRadius: 0, position: "sticky", top: 0, zIndex: 1100, bgcolor: "background.paper" }}
      >
        <Container maxWidth="xl">
          <Box sx={{ textAlign: "center" }}>
            <Typography variant="h3" fontWeight="bold" gutterBottom color="primary">
              {trip.name}
            </Typography>
            <Typography variant="h6" color="text.secondary">
              {new Date(trip.startDate).toLocaleDateString()} - {new Date(trip.endDate).toLocaleDateString()}
            </Typography>
          </Box>
        </Container>
      </Paper>

      <Container maxWidth="xl">
        <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 4 }}>
          <Tabs
            value={viewMode}
            onChange={(_: React.SyntheticEvent, val: string) => setViewMode(val)}
            centered
            indicatorColor="primary"
            textColor="primary"
          >
            <Tab label={t("timeline") || "Timeline"} value="timeline" sx={{ fontWeight: "bold" }} />
            <Tab label={t("calendar") || "Calendar"} value="calendar" sx={{ fontWeight: "bold" }} />
            <Tab label={t("map" as any) || "Map"} value="map" sx={{ fontWeight: "bold" }} />
          </Tabs>
        </Box>

        <Box sx={{ pb: 8, height: viewMode === "map" ? "calc(100vh - 300px)" : "auto" }}>
          {viewMode === "timeline" && (
            <TimelineCalendarView
              days={trip.days || []}
              transport={trip.transport || []}
              exchangeRates={trip.exchangeRates}
              baseCurrency={trip.defaultCurrency}
              isPublic={true}
              onActivityClick={handleActivityClick}
              onTransportClick={handleTransportClick}
            />
          )}
          {viewMode === "calendar" && <CalendarView days={trip.days || []} />}
          {viewMode === "map" && (
            <TripMap
              activities={allActivities}
              canEdit={false}
              onActivityClick={handleActivityClick}
              viewMode="map"
              hideAnimationControl={true}
              transport={trip.transport || []}
              showRoutes={true}
            />
          )}
        </Box>
      </Container>

      <ActivityDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSubmit={async () => {}}
        activity={editingActivity}
        canEdit={false}
        hideCosts={true}
        tripId={trip.id}
        isLoading={false}
        tripStartDate={trip.startDate}
        tripEndDate={trip.endDate}
        tripDays={trip.days}
        currencies={trip.currencies}
        defaultCurrency={trip.defaultCurrency}
      />

      {selectedTransport && (
        <TransportSelectionDialog
          open={transportDialogOpen}
          onClose={() => setTransportDialogOpen(false)}
          tripId={trip.id}
          fromActivityId={selectedTransport.fromActivityId}
          toActivityId={selectedTransport.toActivityId}
          alternatives={
            trip.transport?.filter(
              (t: any) =>
                t.fromActivityId === selectedTransport.fromActivityId &&
                t.toActivityId === selectedTransport.toActivityId,
            ) || []
          }
          onEdit={() => {}}
          onDelete={() => {}}
        />
      )}

      <Box
        component="footer"
        sx={{
          py: 3,
          textAlign: "center",
          bgcolor: "action.hover",
          borderTop: "1px solid",
          borderColor: "divider",
          mt: "auto",
        }}
      >
        <Typography variant="body2" color="text.secondary">
          {t("poweredBy") || "Powered by Trip Explorer"}
        </Typography>
      </Box>
    </Box>
  )
}

export default PublicTripView
