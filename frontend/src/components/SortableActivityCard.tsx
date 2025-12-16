import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { Delete as DeleteIcon, Edit as EditIcon, DragIndicator, NearMe, ContentCopy } from "@mui/icons-material"
import { Paper, Box, Typography, IconButton, Tooltip, Avatar, AvatarGroup } from "@mui/material"

import { useSettingsStore } from "../stores/settingsStore"
import type { Activity } from "../types"

interface SortableActivityCardProps {
  activity: Activity
  onDelete: (id: string) => void
  onEdit: (activity: Activity) => void
  onCopy?: (activity: Activity) => void
  isDeleting?: boolean
  onFlyTo?: (activity: Activity) => void
}

export const SortableActivityCard = ({
  activity,
  onDelete,
  onEdit,
  onCopy,
  isDeleting,
  onFlyTo,
}: SortableActivityCardProps) => {
  const { dateFormat } = useSettingsStore()
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: activity.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <Paper
      ref={setNodeRef}
      style={style}
      sx={{
        p: 1,
        mb: 1,
        bgcolor: "white",
        display: "flex",
        alignItems: "center",
        cursor: "default",
        "&:hover .drag-handle": { opacity: 1 },
      }}
    >
      <Box
        {...attributes}
        {...listeners}
        className="drag-handle"
        sx={{
          cursor: "grab",
          mr: 1,
          color: "text.disabled",
          opacity: 0,
          transition: "opacity 0.2s",
          display: "flex",
          alignItems: "center",
        }}
      >
        <DragIndicator fontSize="small" />
      </Box>

      <Box flexGrow={1}>
        <Typography variant="body2" sx={{ fontWeight: "bold" }}>
          {activity.name}
        </Typography>
        <Typography variant="caption" display="block">
          {activity.scheduledStart
            ? new Date(activity.scheduledStart).toLocaleTimeString(dateFormat, { hour: "2-digit", minute: "2-digit" })
            : "No time"}
        </Typography>
      </Box>
      <Box display="flex" alignItems="center">
        {activity.participants && activity.participants.length > 0 && (
          <AvatarGroup max={3} sx={{ mr: 1, "& .MuiAvatar-root": { width: 24, height: 24, fontSize: "0.75rem" } }}>
            {activity.participants.map((p) => (
              <Tooltip key={p.id} title={p.member.name}>
                <Avatar sx={{ bgcolor: p.member.color, width: 24, height: 24 }}>{p.member.name.charAt(0)}</Avatar>
              </Tooltip>
            ))}
          </AvatarGroup>
        )}
        <Box>
          {activity.latitude && activity.longitude && (
            <Tooltip title="Fly to location on map">
              <IconButton size="small" onClick={() => onFlyTo && onFlyTo(activity)} sx={{ mr: 0.5 }} color="primary">
                <NearMe fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          <Tooltip title="Copy this activity">
            <IconButton size="small" onClick={() => onCopy && onCopy(activity)} sx={{ mr: 0.5 }}>
              <ContentCopy fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Edit activity">
            <IconButton size="small" onClick={() => onEdit(activity)} sx={{ mr: 0.5 }}>
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete activity">
            <IconButton size="small" onClick={() => onDelete(activity.id)} disabled={isDeleting} color="error">
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
    </Paper>
  )
}
