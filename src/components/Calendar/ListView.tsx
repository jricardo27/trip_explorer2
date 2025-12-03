import ExpandLessIcon from "@mui/icons-material/ExpandLess"
import ExpandMoreIcon from "@mui/icons-material/ExpandMore"
import {
  Box,
  List,
  ListItem,
  ListItemText,
  Typography,
  Chip,
  IconButton,
  Divider,
  Collapse,
  Paper,
} from "@mui/material"
import axios from "axios"
import React, { useState, useEffect, useCallback, useMemo } from "react"

interface Activity {
  id: string
  name: string
  scheduled_start: string
  scheduled_end: string | null
  activity_type: string
  is_flexible: boolean
  latitude?: number
  longitude?: number
}

interface ListViewProps {
  tripId: string
}

const ListView: React.FC<ListViewProps> = ({ tripId }) => {
  const [activities, setActivities] = useState<Activity[]>([])
  const [expandedDays, setExpandedDays] = useState<Record<string, boolean>>({})

  const fetchActivities = useCallback(async () => {
    try {
      const response = await axios.get(`/api/trips/${tripId}/activities`)
      setActivities(response.data)
    } catch (err) {
      console.error("Error fetching activities:", err)
    }
  }, [tripId])

  useEffect(() => {
    fetchActivities()
  }, [fetchActivities])

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString([], {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    })
  }

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  // Group activities by day
  const groupedActivities = useMemo(() => {
    return activities.reduce(
      (acc, activity) => {
        if (!activity.scheduled_start) return acc
        const date = new Date(activity.scheduled_start).toDateString()
        if (!acc[date]) {
          acc[date] = []
        }
        acc[date].push(activity)
        return acc
      },
      {} as Record<string, Activity[]>,
    )
  }, [activities])

  // Initialize all days as expanded
  useEffect(() => {
    const initialExpanded: Record<string, boolean> = {}
    Object.keys(groupedActivities).forEach((date) => {
      initialExpanded[date] = true
    })
    setExpandedDays(initialExpanded)
  }, [groupedActivities])

  const toggleDay = (date: string) => {
    setExpandedDays((prev) => ({
      ...prev,
      [date]: !prev[date],
    }))
  }

  if (activities.length === 0) {
    return (
      <Box sx={{ p: 3, textAlign: "center" }}>
        <Typography color="text.secondary">No activities found for this trip.</Typography>
      </Box>
    )
  }

  const sortedDates = Object.keys(groupedActivities).sort((a, b) => new Date(a).getTime() - new Date(b).getTime())

  return (
    <Box>
      {sortedDates.map((date) => {
        const dayActivities = groupedActivities[date]
        const isExpanded = expandedDays[date] ?? true

        return (
          <Paper key={date} sx={{ mb: 2 }} elevation={1}>
            {/* Day Header */}
            <Box
              sx={{
                p: 2,
                bgcolor: "primary.main",
                color: "primary.contrastText",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                cursor: "pointer",
              }}
              onClick={() => toggleDay(date)}
            >
              <Box>
                <Typography variant="h6">{formatDate(dayActivities[0].scheduled_start)}</Typography>
                <Typography variant="caption">
                  {dayActivities.length} {dayActivities.length === 1 ? "activity" : "activities"}
                </Typography>
              </Box>
              <IconButton size="small" sx={{ color: "inherit" }}>
                {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              </IconButton>
            </Box>

            {/* Activities List */}
            <Collapse in={isExpanded}>
              <List disablePadding>
                {dayActivities.map((activity, index) => (
                  <React.Fragment key={activity.id}>
                    <ListItem sx={{ py: 2 }}>
                      <ListItemText
                        primary={
                          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
                            <Typography variant="subtitle1" fontWeight="medium">
                              {activity.name}
                            </Typography>
                            {activity.is_flexible && <Chip label="Flexible" size="small" variant="outlined" />}
                            <Chip label={activity.activity_type} size="small" color="primary" variant="outlined" />
                          </Box>
                        }
                        secondary={
                          <>
                            <Typography component="span" variant="body2" color="text.secondary" display="block">
                              🕐 {formatTime(activity.scheduled_start)}
                              {activity.scheduled_end && ` - ${formatTime(activity.scheduled_end)}`}
                            </Typography>
                            {(activity.latitude || activity.longitude) && (
                              <Typography component="span" variant="body2" color="text.secondary" display="block">
                                📍 {activity.latitude?.toFixed(4)}, {activity.longitude?.toFixed(4)}
                              </Typography>
                            )}
                          </>
                        }
                      />
                    </ListItem>
                    {index < dayActivities.length - 1 && <Divider />}
                  </React.Fragment>
                ))}
              </List>
            </Collapse>
          </Paper>
        )
      })}
    </Box>
  )
}

export default ListView
