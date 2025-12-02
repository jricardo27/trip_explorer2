import AccessTimeIcon from "@mui/icons-material/AccessTime"
import ArrowForwardIcon from "@mui/icons-material/ArrowForward"
import { Box, Typography, List, ListItem, ListItemText, Alert, Chip, Divider } from "@mui/material"
import React from "react"

import { UpdatePreview, ScheduleUpdate } from "../../types/transport"

interface ImpactPreviewProps {
  preview: UpdatePreview
}

const formatTime = (dateStr: string) => {
  return new Date(dateStr).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
}

const ImpactPreview: React.FC<ImpactPreviewProps> = ({ preview }) => {
  if (!preview || preview.affected_activities.length === 0) {
    return null
  }

  const hasConflicts = preview.conflicts.length > 0
  const shiftMinutes = preview.total_shift_minutes

  return (
    <Box sx={{ mt: 2, p: 2, bgcolor: "background.paper", borderRadius: 1, border: "1px solid #e0e0e0" }}>
      <Typography variant="subtitle2" gutterBottom sx={{ display: "flex", alignItems: "center" }}>
        <AccessTimeIcon fontSize="small" sx={{ mr: 1 }} />
        Schedule Impact
      </Typography>

      <Alert severity={hasConflicts ? "error" : "info"} sx={{ mb: 2 }}>
        Selecting this option will shift {preview.affected_activities.length} downstream activities by{" "}
        {Math.abs(shiftMinutes)} minutes.
        {hasConflicts && " This creates conflicts with fixed-time activities."}
      </Alert>

      <List dense disablePadding>
        {preview.affected_activities.map((update: ScheduleUpdate) => (
          <ListItem key={update.activity_id} disableGutters>
            <ListItemText
              primary={
                <Box sx={{ display: "flex", alignItems: "center" }}>
                  <Typography variant="body2" sx={{ width: 120 }}>
                    Activity {update.activity_id.substring(0, 8)}...
                  </Typography>
                  <Chip label={formatTime(update.old_start)} size="small" variant="outlined" sx={{ mx: 1 }} />
                  <ArrowForwardIcon fontSize="small" color="action" />
                  <Chip
                    label={formatTime(update.new_start)}
                    size="small"
                    color={shiftMinutes > 0 ? "warning" : "success"}
                    sx={{ ml: 1 }}
                  />
                </Box>
              }
            />
          </ListItem>
        ))}
      </List>

      {hasConflicts && (
        <>
          <Divider sx={{ my: 1 }} />
          <Typography variant="caption" color="error">
            Conflicts detected with: {preview.conflicts.join(", ")}
          </Typography>
        </>
      )}
    </Box>
  )
}

export default ImpactPreview
