import ListIcon from "@mui/icons-material/List"
import MapIcon from "@mui/icons-material/Map"
import ViewTimelineIcon from "@mui/icons-material/ViewTimeline"
import ViewWeekIcon from "@mui/icons-material/ViewWeek"
import { Box, Paper, Tabs, Tab } from "@mui/material"
import React, { useState } from "react"

import GanttView from "./GanttView"
import ListView from "./ListView"
import MapView from "./MapView"
import TimelineView from "./TimelineView"

interface CalendarViewsProps {
  tripId: string
}

const CalendarViews: React.FC<CalendarViewsProps> = ({ tripId }) => {
  const [currentView, setCurrentView] = useState(() => {
    const saved = localStorage.getItem("calendarViewPreference")
    return saved ? parseInt(saved, 10) : 0
  })

  const handleViewChange = (_event: React.SyntheticEvent, newValue: number) => {
    setCurrentView(newValue)
    localStorage.setItem("calendarViewPreference", newValue.toString())
  }

  return (
    <Box>
      <Paper sx={{ mb: 2 }}>
        <Tabs value={currentView} onChange={handleViewChange} variant="fullWidth">
          <Tab icon={<ViewTimelineIcon />} label="Timeline" />
          <Tab icon={<ListIcon />} label="List" />
          <Tab icon={<MapIcon />} label="Map" />
          <Tab icon={<ViewWeekIcon />} label="Gantt" />
        </Tabs>
      </Paper>

      <Box>
        {currentView === 0 && <TimelineView tripId={tripId} />}
        {currentView === 1 && <ListView tripId={tripId} />}
        {currentView === 2 && <MapView tripId={tripId} />}
        {currentView === 3 && <GanttView tripId={tripId} />}
      </Box>
    </Box>
  )
}

export default CalendarViews
