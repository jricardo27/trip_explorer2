import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { Paper, Box, Typography, IconButton } from "@mui/material"
import { Delete as DeleteIcon, Edit as EditIcon, DragIndicator } from "@mui/icons-material"
import type { Activity } from "../types"
import { useSettingsStore } from "../stores/settingsStore"

interface SortableActivityCardProps {
  activity: Activity
  onDelete: (id: string) => void
  onEdit: (activity: Activity) => void
  isDeleting?: boolean
}

export const SortableActivityCard = ({ activity, onDelete, onEdit, isDeleting }: SortableActivityCardProps) => {
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
      <Box>
        <IconButton size="small" onClick={() => onEdit(activity)} sx={{ mr: 0.5 }}>
          <EditIcon fontSize="small" />
        </IconButton>
        <IconButton size="small" color="error" onClick={() => onDelete(activity.id)} disabled={isDeleting}>
          <DeleteIcon fontSize="small" />
        </IconButton>
      </Box>
    </Paper>
  )
}
