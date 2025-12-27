import {
  Timeline as TimelineIcon,
  List as ListIcon,
  Assessment as ExpenseIcon,
  PlaylistAddCheck as PrepIcon,
  ArrowBack as BackIcon,
  Settings as SettingsIcon,
  People as PeopleIcon,
  Print as PrintIcon,
  Book as JournalIcon,
  Movie as AnimationIcon,
  Download as DownloadIcon,
  CalendarMonth as CalendarIcon,
  Map as MapIcon,
} from "@mui/icons-material"
import { Box, Typography, Paper, Button, IconButton, Tabs, Tab, Chip } from "@mui/material"
import dayjs from "dayjs"
import { useNavigate } from "react-router-dom"

import { useLanguageStore } from "../stores/languageStore"
import type { Trip } from "../types"

interface TripDetailsHeaderProps {
  trip: Trip
  viewMode: string
  canEdit: boolean
  handleViewModeChange: (_: React.SyntheticEvent, newMode: any) => void
  handleExportKML: () => void
  setSettingsDialogOpen: (open: boolean) => void
  setMembersDialogOpen: (open: boolean) => void
}

export const TripDetailsHeader = ({
  trip,
  viewMode,
  canEdit,
  handleViewModeChange,
  handleExportKML,
  setSettingsDialogOpen,
  setMembersDialogOpen,
}: TripDetailsHeaderProps) => {
  const { t } = useLanguageStore()
  const navigate = useNavigate()

  return (
    <Paper
      elevation={0}
      className="no-print"
      sx={{
        p: 2,
        mb: 2,
        position: "sticky",
        top: 0,
        zIndex: 10,
        borderBottom: 1,
        borderColor: "divider",
        bgcolor: "background.paper",
      }}
    >
      <Box display="flex" justifyContent="space-between" alignItems="center">
        <Box display="flex" alignItems="center" gap={1}>
          <IconButton onClick={() => navigate("/trips")}>
            <BackIcon />
          </IconButton>
          <Typography variant="h5" component="h1">
            {trip.name}
          </Typography>
          <Chip
            label={`${dayjs(trip.startDate).format("MMM D")} - ${dayjs(trip.endDate).format("MMM D, YYYY")}`}
            variant="outlined"
            size="small"
            sx={{ ml: 1 }}
          />
          <Box display="flex" gap={1} flexShrink={0}>
            {trip.destination && <Chip label={trip.destination} variant="outlined" size="small" />}
            <Chip label={`${trip.days?.length || 0} ${t("days")}`} variant="outlined" size="small" />
          </Box>
        </Box>
        <Box display="flex" gap={1}>
          <Button
            variant="outlined"
            startIcon={<SettingsIcon />}
            size="small"
            onClick={() => setSettingsDialogOpen(true)}
            disabled={!canEdit}
          >
            {t("settings")}
          </Button>
          <Button
            variant="outlined"
            startIcon={<PeopleIcon />}
            size="small"
            onClick={() => setMembersDialogOpen(true)}
            disabled={!canEdit}
          >
            {t("members")}
          </Button>
          <Button variant="outlined" startIcon={<PrintIcon />} size="small" onClick={() => window.print()}>
            {t("print")}
          </Button>
          <Button variant="outlined" startIcon={<DownloadIcon />} size="small" onClick={handleExportKML}>
            {t("exportKML")}
          </Button>
        </Box>
      </Box>

      <Box
        sx={{
          mt: 2,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          overflowX: "auto",
          pb: 1,
          borderTop: 1,
          borderColor: "divider",
          pt: 1,
        }}
      >
        <Box className="no-print">
          <Tabs
            value={viewMode}
            onChange={handleViewModeChange}
            centered
            sx={{ minHeight: "32px", "& .MuiTab-root": { minHeight: "32px", py: 0 } }}
          >
            <Tab
              icon={<ListIcon sx={{ fontSize: "1.1rem" }} />}
              label={t("itinerary")}
              iconPosition="start"
              value="list"
              sx={{ minHeight: "32px" }}
            />
            <Tab
              icon={<PrepIcon sx={{ fontSize: "1.1rem" }} />}
              label={t("preparation")}
              iconPosition="start"
              value="prep"
              sx={{ minHeight: "32px" }}
            />
            <Tab
              icon={<ExpenseIcon sx={{ fontSize: "1.1rem" }} />}
              label={t("expenses")}
              iconPosition="start"
              value="expenses"
              sx={{ minHeight: "32px" }}
            />
            <Tab
              icon={<TimelineIcon sx={{ fontSize: "1.1rem" }} />}
              label={t("timeline")}
              iconPosition="start"
              value="timeline"
              sx={{ minHeight: "32px" }}
            />
            <Tab
              icon={<MapIcon sx={{ fontSize: "1.1rem" }} />}
              label={t("map") || "Map"}
              iconPosition="start"
              value="map"
              sx={{ minHeight: "32px" }}
            />
            <Tab
              icon={<CalendarIcon sx={{ fontSize: "1.1rem" }} />}
              label={t("calendar" as any) || "Calendar"}
              iconPosition="start"
              value="calendar"
              sx={{ minHeight: "32px" }}
            />
            <Tab
              icon={<JournalIcon sx={{ fontSize: "1.1rem" }} />}
              label={t("journal")}
              iconPosition="start"
              value="journal"
              sx={{ minHeight: "32px" }}
            />
            <Tab
              icon={<AnimationIcon sx={{ fontSize: "1.1rem" }} />}
              label={t("animation")}
              iconPosition="start"
              value="animation"
              sx={{ minHeight: "32px" }}
            />
          </Tabs>
        </Box>
      </Box>
    </Paper>
  )
}
