import DeleteIcon from "@mui/icons-material/Delete"
import EditIcon from "@mui/icons-material/Edit"
import { Box, List, ListItem, ListItemText, Typography, Chip, IconButton, Divider } from "@mui/material"
import axios from "axios"
import React, { useState, useEffect, useCallback } from "react"

interface Activity {
  id: string
  title: string
  start_time: string
  end_time: string
  location_name?: string
  activity_type: string
  is_optional: boolean
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
                    <Typography variant="subtitle1">{activity.title}</Typography>
                    {activity.is_optional && <Chip label="Optional" size="small" variant="outlined" />}
                    <Chip label={activity.activity_type} size="small" color="primary" variant="outlined" />
                  </Box>
                }
                secondary={
                  <>
                    <Typography component="span" variant="body2" color="text.secondary">
                      {formatDateTime(activity.start_time)} - {formatDateTime(activity.end_time)}
                    </Typography>
                    {activity.location_name && (
                      <>
                        <br />
                        <Typography component="span" variant="body2" color="text.secondary">
                          📍 {activity.location_name}
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
