import DeleteIcon from "@mui/icons-material/Delete"
import EditIcon from "@mui/icons-material/Edit"
import { Box, List, ListItem, ListItemText, Typography, Chip, IconButton, Divider } from "@mui/material"
import axios from "axios"
import React, { useState, useEffect, useCallback } from "react"

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

  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString([], {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  if (activities.length === 0) {
    return (
      <Box sx={{ p: 3, textAlign: "center" }}>
        <Typography color="text.secondary">No activities found for this trip.</Typography>
      </Box>
    )
  }

  return (
    <Box>
      <List>
        {activities.map((activity, index) => (
          <React.Fragment key={activity.id}>
            <ListItem
              secondaryAction={
                <Box>
                  <IconButton edge="end" aria-label="edit">
                    <EditIcon />
                  </IconButton>
                  <IconButton edge="end" aria-label="delete">
                    <DeleteIcon />
                  </IconButton>
                </Box>
              }
            >
              <ListItemText
                primary={
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Typography variant="subtitle1">{activity.name}</Typography>
                    {activity.is_flexible && <Chip label="Flexible" size="small" variant="outlined" />}
                    <Chip label={activity.activity_type} size="small" color="primary" variant="outlined" />
                  </Box>
                }
                secondary={
                  <>
                    <Typography component="span" variant="body2" color="text.secondary">
                      {formatDateTime(activity.scheduled_start)}
                      {activity.scheduled_end && ` - ${formatDateTime(activity.scheduled_end)}`}
                    </Typography>
                    {(activity.latitude || activity.longitude) && (
                      <>
                        <br />
                        <Typography component="span" variant="body2" color="text.secondary">
                          📍 {activity.latitude?.toFixed(4)}, {activity.longitude?.toFixed(4)}
                        </Typography>
                      </>
                    )}
                  </>
                }
              />
            </ListItem>
            {index < activities.length - 1 && <Divider />}
          </React.Fragment>
        ))}
      </List>
    </Box>
  )
}

export default ListView
