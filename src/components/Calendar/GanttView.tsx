import { Box, Typography, Paper, Tooltip } from "@mui/material"
import axios from "axios"
import React, { useState, useEffect, useCallback, useMemo } from "react"

interface Activity {
  id: string
  name: string
  scheduled_start: string | null
  scheduled_end: string | null
  activity_type: string
  description?: string
}

interface GanttViewProps {
  tripId: string
}

import { useTripContext, Conflict } from "../../contexts/TripContext"

const GanttView: React.FC<GanttViewProps> = ({ tripId }) => {
  const [activities, setActivities] = useState<Activity[]>([])
  const [conflicts, setConflicts] = useState<Conflict[]>([])

  const { fetchConflicts } = useTripContext()

  const fetchActivities = useCallback(async () => {
    try {
      const response = await axios.get(`/api/trips/${tripId}/activities`)
      setActivities(response.data)
    } catch (err) {
      console.error("Error fetching activities:", err)
    }
  }, [tripId])

  const loadConflicts = useCallback(async () => {
    const data = await fetchConflicts(tripId)
    setConflicts(data)
  }, [tripId, fetchConflicts])

  useEffect(() => {
    fetchActivities()
    loadConflicts()
  }, [fetchActivities, loadConflicts])

  const getConflictForActivity = (activityId: string) => {
    return conflicts.find((c) => c.activity1_id === activityId || c.activity2_id === activityId)
  }

  // Calculate timeline bounds
  const bounds = useMemo(() => {
    if (activities.length === 0) return { start: new Date(), end: new Date() }
    const validActivities = activities.filter((a) => a.scheduled_start && a.scheduled_end)
    if (validActivities.length === 0) return { start: new Date(), end: new Date() }
    const times = validActivities.flatMap((a) => [new Date(a.scheduled_start!), new Date(a.scheduled_end!)])
    return {
      start: new Date(Math.min(...times.map((t) => t.getTime()))),
      end: new Date(Math.max(...times.map((t) => t.getTime()))),
    }
  }, [activities])

  const totalDuration = bounds.end.getTime() - bounds.start.getTime()

  const getActivityPosition = (activity: Activity) => {
    if (!activity.scheduled_start || !activity.scheduled_end) return { left: "0%", width: "0%" }
    const start = new Date(activity.scheduled_start).getTime() - bounds.start.getTime()
    const duration = new Date(activity.scheduled_end).getTime() - new Date(activity.scheduled_start).getTime()
    return {
      left: `${(start / totalDuration) * 100}%`,
      width: `${Math.max((duration / totalDuration) * 100, 2)}%`, // Minimum 2% width for visibility
    }
  }

  const getActivityColor = (type: string) => {
    const colors: Record<string, string> = {
      accommodation: "#4CAF50",
      transport: "#2196F3",
      dining: "#FF9800",
      activity: "#9C27B0",
      sightseeing: "#F44336",
    }
    return colors[type] || "#757575"
  }

  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString([], {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const formatDuration = (start: string, end: string) => {
    const duration = new Date(end).getTime() - new Date(start).getTime()
    const hours = Math.floor(duration / (1000 * 60 * 60))
    const minutes = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60))
    if (hours > 0) {
      return `${hours}h ${minutes}m`
    }
    return `${minutes}m`
  }

  const validActivities = useMemo(() => activities.filter((a) => a.scheduled_start && a.scheduled_end), [activities])

  if (validActivities.length === 0) {
    return (
      <Box sx={{ p: 3, textAlign: "center" }}>
        <Typography color="text.secondary">
          No activities with scheduled times found. Add start and end times to activities to see them in the Gantt
          chart.
        </Typography>
      </Box>
    )
  }

  // Calculate day markers
  const dayMarkers: Date[] = []
  const currentDay = new Date(bounds.start)
  currentDay.setHours(0, 0, 0, 0)
  while (currentDay <= bounds.end) {
    dayMarkers.push(new Date(currentDay))
    currentDay.setDate(currentDay.getDate() + 1)
  }

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Gantt Chart
      </Typography>
      <Box sx={{ position: "relative", minHeight: validActivities.length * 60 + 80, overflowX: "auto" }}>
        {/* Timeline header with day markers */}
        <Box sx={{ position: "relative", height: 40, mb: 2 }}>
          {dayMarkers.map((day, index) => {
            const dayStart = day.getTime() - bounds.start.getTime()
            const position = (dayStart / totalDuration) * 100
            return (
              <Box
                key={index}
                sx={{
                  position: "absolute",
                  left: `calc(160px + ${position}%)`,
                  top: 0,
                  borderLeft: "1px dashed",
                  borderColor: "divider",
                  height: "100%",
                  pl: 0.5,
                }}
              >
                <Typography variant="caption" color="text.secondary">
                  {day.toLocaleDateString([], { month: "short", day: "numeric" })}
                </Typography>
              </Box>
            )
          })}
        </Box>

        {/* Activity bars */}
        {validActivities.map((activity) => {
          const position = getActivityPosition(activity)
          const color = getActivityColor(activity.activity_type)
          const conflict = getConflictForActivity(activity.id)

          return (
            <Box key={activity.id} sx={{ position: "relative", height: 50, mb: 1 }}>
              <Typography
                variant="caption"
                sx={{
                  position: "absolute",
                  left: 0,
                  top: "50%",
                  transform: "translateY(-50%)",
                  width: 150,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  fontWeight: "medium",
                }}
              >
                {activity.name}
              </Typography>
              <Tooltip
                title={
                  <Box>
                    <Typography variant="subtitle2">{activity.name}</Typography>
                    <Typography variant="caption" display="block">
                      Type: {activity.activity_type}
                    </Typography>
                    <Typography variant="caption" display="block">
                      Start: {formatDateTime(activity.scheduled_start!)}
                    </Typography>
                    <Typography variant="caption" display="block">
                      End: {formatDateTime(activity.scheduled_end!)}
                    </Typography>
                    <Typography variant="caption" display="block">
                      Duration: {formatDuration(activity.scheduled_start!, activity.scheduled_end!)}
                    </Typography>
                    {activity.description && (
                      <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
                        {activity.description}
                      </Typography>
                    )}
                  </Box>
                }
                arrow
              >
                <Paper
                  sx={{
                    position: "absolute",
                    left: `calc(160px + ${position.left})`,
                    width: position.width,
                    height: 30,
                    top: "50%",
                    transform: "translateY(-50%)",
                    bgcolor: color,
                    border: conflict ? "2px solid #d32f2f" : "none",
                    display: "flex",
                    alignItems: "center",
                    px: 1,
                    minWidth: 50,
                    cursor: "pointer",
                    transition: "all 0.2s",
                    "&:hover": {
                      transform: "translateY(-50%) scale(1.05)",
                      boxShadow: 3,
                    },
                  }}
                >
                  {conflict && (
                    <Box
                      sx={{
                        position: "absolute",
                        top: -8,
                        right: -8,
                        bgcolor: "#d32f2f",
                        borderRadius: "50%",
                        width: 16,
                        height: 16,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "white",
                        fontSize: "10px",
                        fontWeight: "bold",
                        zIndex: 1,
                      }}
                    >
                      !
                    </Box>
                  )}
                  <Typography
                    variant="caption"
                    sx={{
                      color: "white",
                      fontSize: "0.7rem",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {new Date(activity.scheduled_start!).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </Typography>
                </Paper>
              </Tooltip>
            </Box>
          )
        })}
      </Box>
    </Box>
  )
}

export default GanttView
