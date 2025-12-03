import { Box, Typography, Paper } from "@mui/material"
import axios from "axios"
import React, { useState, useEffect, useCallback } from "react"

interface Activity {
  id: string
  name: string
  scheduled_start: string | null
  scheduled_end: string | null
}

interface GanttViewProps {
  tripId: string
}

const GanttView: React.FC<GanttViewProps> = ({ tripId }) => {
  const [activities, setActivities] = useState<Activity[]>([])

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

  // Calculate timeline bounds
  const getTimelineBounds = () => {
    if (activities.length === 0) return { start: new Date(), end: new Date() }
    const validActivities = activities.filter((a) => a.scheduled_start && a.scheduled_end)
    if (validActivities.length === 0) return { start: new Date(), end: new Date() }
    const times = validActivities.flatMap((a) => [new Date(a.scheduled_start!), new Date(a.scheduled_end!)])
    return {
      start: new Date(Math.min(...times.map((t) => t.getTime()))),
      end: new Date(Math.max(...times.map((t) => t.getTime()))),
    }
  }

  const bounds = getTimelineBounds()
  const totalDuration = bounds.end.getTime() - bounds.start.getTime()

  const getActivityPosition = (activity: Activity) => {
    if (!activity.scheduled_start || !activity.scheduled_end) return { left: "0%", width: "0%" }
    const start = new Date(activity.scheduled_start).getTime() - bounds.start.getTime()
    const duration = new Date(activity.scheduled_end).getTime() - new Date(activity.scheduled_start).getTime()
    return {
      left: `${(start / totalDuration) * 100}%`,
      width: `${(duration / totalDuration) * 100}%`,
    }
  }

  const validActivities = activities.filter((a) => a.scheduled_start && a.scheduled_end)

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

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Gantt Chart
      </Typography>
      <Box sx={{ position: "relative", minHeight: validActivities.length * 60 + 40 }}>
        {/* Timeline header */}
        <Box sx={{ display: "flex", mb: 2, px: 2 }}>
          <Typography variant="caption" color="text.secondary">
            {bounds.start.toLocaleDateString()}
          </Typography>
          <Box sx={{ flexGrow: 1 }} />
          <Typography variant="caption" color="text.secondary">
            {bounds.end.toLocaleDateString()}
          </Typography>
        </Box>

        {/* Activity bars */}
        {validActivities.map((activity) => {
          const position = getActivityPosition(activity)
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
                }}
              >
                {activity.name}
              </Typography>
              <Paper
                sx={{
                  position: "absolute",
                  left: `calc(160px + ${position.left})`,
                  width: position.width,
                  height: 30,
                  top: "50%",
                  transform: "translateY(-50%)",
                  bgcolor: "primary.main",
                  display: "flex",
                  alignItems: "center",
                  px: 1,
                  minWidth: 50,
                }}
              >
                <Typography variant="caption" sx={{ color: "white", fontSize: "0.7rem" }}>
                  {new Date(activity.scheduled_start!).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </Typography>
              </Paper>
            </Box>
          )
        })}
      </Box>
    </Box>
  )
}

export default GanttView
