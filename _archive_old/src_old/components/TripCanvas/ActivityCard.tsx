import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { Box, Card, CardContent, Typography, IconButton, Chip } from "@mui/material"
import React from "react"
import { MdDragIndicator, MdEdit, MdDelete, MdLocationOn, MdPlace } from "react-icons/md"

import { DayLocation, TripFeature } from "../../contexts/TripContext"

interface ActivityCardProps {
  item: DayLocation | TripFeature
  isOverlay?: boolean
  onEdit?: () => void
  onDelete?: () => void
}

const ActivityCard: React.FC<ActivityCardProps> = ({ item, isOverlay, onEdit, onDelete }) => {
  const isLocation = "city" in item
  const id = isLocation
    ? (item as DayLocation).id
    : (item as TripFeature).saved_id || (item as TripFeature).properties.id

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
    data: { item },
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const name = isLocation
    ? (item as DayLocation).city
    : (item as TripFeature).properties.title || (item as TripFeature).properties.name || "Untitled"

  const startTime = item.start_time
    ? item.start_time.includes("T")
      ? new Date(item.start_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      : item.start_time.slice(0, 5)
    : null

  const duration = item.duration_minutes ? `${item.duration_minutes} min` : null

  return (
    <Card
      ref={setNodeRef}
      style={style}
      elevation={isOverlay ? 5 : 1}
      sx={{
        display: "flex",
        alignItems: "center",
        position: "relative",
        "&:hover .actions": { opacity: 1 },
      }}
    >
      <Box
        {...attributes}
        {...listeners}
        sx={{
          p: 1.5,
          cursor: "grab",
          color: "text.disabled",
          display: "flex",
          alignItems: "center",
          "&:hover": { color: "text.primary" },
        }}
      >
        <MdDragIndicator />
      </Box>

      <CardContent sx={{ flexGrow: 1, py: 2, px: 1, "&:last-child": { pb: 2 } }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
          {startTime && <Chip label={startTime} size="small" sx={{ height: 20, fontSize: "0.7rem" }} />}
          {duration && (
            <Chip label={duration} size="small" sx={{ height: 20, fontSize: "0.7rem", bgcolor: "action.hover" }} />
          )}
          <Typography variant="subtitle1" fontWeight="medium" noWrap>
            {name}
          </Typography>
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, color: "text.secondary" }}>
          {isLocation ? <MdLocationOn size={16} /> : <MdPlace size={16} />}
          <Typography variant="body2" noWrap>
            {isLocation ? (item as DayLocation).country : (item as TripFeature).properties.type || "Place"}
          </Typography>
          {item.transport_mode && (
            <>
              <Typography variant="body2" sx={{ mx: 0.5 }}>
                •
              </Typography>
              <Chip
                label={item.transport_mode}
                size="small"
                sx={{ height: 18, fontSize: "0.65rem", textTransform: "capitalize" }}
              />
            </>
          )}
        </Box>
      </CardContent>

      <Box
        className="actions"
        sx={{
          opacity: 0,
          transition: "opacity 0.2s",
          display: "flex",
          pr: 1,
        }}
      >
        <IconButton size="small" onClick={onEdit}>
          <MdEdit fontSize="small" />
        </IconButton>
        <IconButton size="small" onClick={onDelete}>
          <MdDelete fontSize="small" />
        </IconButton>
      </Box>
    </Card>
  )
}

export default ActivityCard
