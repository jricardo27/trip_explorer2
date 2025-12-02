import { Box, Typography, Paper } from "@mui/material"
import axios from "axios"
import React, { useState, useEffect, useCallback } from "react"

interface Activity {
  id: string
  title: string
  start_time: string
  end_time: string
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
    const times = activities.flatMap((a) => [new Date(a.start_time), new Date(a.end_time)])
    return {
      start: new Date(Math.min(...times.map((t) => t.getTime()))),
      end: new Date(Math.max(...times.map((t) => t.getTime()))),
    }
  }

  const bounds = getTimelineBounds()
  const totalDuration = bounds.end.getTime() - bounds.start.getTime()

  const getActivityPosition = (activity: Activity) => {
    const start = new Date(activity.start_time).getTime() - bounds.start.getTime()
    const duration = new Date(activity.end_time).getTime() - new Date(activity.start_time).getTime()
    return {
      left: `${(start / totalDuration) * 100}%`,
      width: `${(duration / totalDuration) * 100}%`,
    }
  }

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Gantt Chart
      </Typography>
      <Box sx={{ position: "relative", minHeight: activities.length * 60 + 40 }}>
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
        {activities.map((activity) => {
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
                {activity.title}
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
                  {new Date(activity.start_time).toLocaleTimeString([], {
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
