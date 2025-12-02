import { Box, Typography, Paper, Stack } from "@mui/material"
import axios from "axios"
import React, { useState, useEffect, useCallback } from "react"

interface Activity {
  id: string
  title: string
  start_time: string
  end_time: string
  location_name?: string
  activity_type: string
}

interface TimelineViewProps {
  tripId: string
}

const TimelineView: React.FC<TimelineViewProps> = ({ tripId }) => {
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

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString([], {
      weekday: "short",
      month: "short",
      day: "numeric",
    })
  }

  // Group activities by date
  const groupedActivities = activities.reduce(
    (acc, activity) => {
      const date = new Date(activity.start_time).toDateString()
      if (!acc[date]) {
        acc[date] = []
      }
      acc[date].push(activity)
      return acc
    },
    {} as Record<string, Activity[]>,
  )

  return (
    <Box>
      {Object.entries(groupedActivities).map(([date, dayActivities]) => (
        <Box key={date} sx={{ mb: 4 }}>
          <Typography variant="h6" sx={{ mb: 2, color: "primary.main" }}>
            {formatDate(dayActivities[0].start_time)}
          </Typography>
          <Stack spacing={2}>
            {dayActivities.map((activity) => (
              <Paper
                key={activity.id}
                sx={{
                  p: 2,
                  ml: 4,
                  borderLeft: "4px solid",
                  borderLeftColor: "primary.main",
                  position: "relative",
                }}
              >
                <Box
                  sx={{
                    position: "absolute",
                    left: -12,
                    top: "50%",
                    transform: "translateY(-50%)",
                    width: 20,
                    height: 20,
                    borderRadius: "50%",
                    bgcolor: "primary.main",
                    border: "3px solid white",
                  }}
                />
                <Typography variant="subtitle1" fontWeight="bold">
                  {activity.title}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {formatTime(activity.start_time)} - {formatTime(activity.end_time)}
                </Typography>
                {activity.location_name && (
                  <Typography variant="body2" color="text.secondary">
                    📍 {activity.location_name}
                  </Typography>
                )}
              </Paper>
            ))}
          </Stack>
        </Box>
      ))}
    </Box>
  )
}

export default TimelineView
