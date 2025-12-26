import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import {
  Delete as DeleteIcon,
  Edit as EditIcon,
  DragIndicator,
  NearMe,
  ContentCopy,
  Warning,
  Lock,
} from "@mui/icons-material"
import {
  Paper,
  Box,
  Typography,
  IconButton,
  Tooltip,
  Avatar,
  AvatarGroup,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
} from "@mui/material"
import dayjs from "dayjs"
import { useMemo, useState } from "react"

import { useLanguageStore } from "../stores/languageStore"
import type { Activity } from "../types"

interface SortableActivityCardProps {
  activity: Activity
  onDelete: (id: string) => void
  onEdit: (activity: Activity) => void
  onCopy?: (activity: Activity, asLink?: boolean) => void
  isDeleting?: boolean
  onFlyTo?: (activity: Activity) => void
  canEdit?: boolean
}

export const SortableActivityCard = ({
  activity,
  onDelete,
  onEdit,
  onCopy,
  isDeleting,
  onFlyTo,
  canEdit = true,
}: SortableActivityCardProps) => {
  const { t } = useLanguageStore()
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: activity.id,
    disabled: activity.isLocked || !canEdit,
  })

  const [copyMenuAnchor, setCopyMenuAnchor] = useState<null | HTMLElement>(null)

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const isAvailable = useMemo(() => {
    if (!activity.availableDays || activity.availableDays.length === 0) return true
    const dateToCheck = activity.scheduledStart || activity.tripDay?.date
    if (!dateToCheck) return true

    const scheduledDay = dayjs(dateToCheck).format("dddd")
    return activity.availableDays.includes(scheduledDay)
  }, [activity.availableDays, activity.scheduledStart, activity.tripDay?.date])

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
        borderStyle: activity.priority === "optional" ? "dashed" : "solid",
        borderWidth: activity.priority === "mandatory" ? 2 : 1,
        borderColor: activity.priority === "mandatory" ? "primary.main" : "transparent",
        backgroundColor: activity.isLocked ? "action.hover" : "white",
        "&:hover .drag-handle": { opacity: 1 },
      }}
    >
      <Box
        {...attributes}
        {...(activity.isLocked ? {} : listeners)}
        className="drag-handle"
        sx={{
          cursor: activity.isLocked ? "default" : "grab",
          mr: 1,
          color: "text.disabled",
          opacity: activity.isLocked ? 1 : 0,
          transition: "opacity 0.2s",
          display: "flex",
          alignItems: "center",
        }}
      >
        {activity.isLocked ? <Lock fontSize="small" /> : <DragIndicator fontSize="small" />}
      </Box>

      <Box flexGrow={1}>
        <Typography variant="body2" sx={{ fontWeight: "bold" }}>
          {activity.name}
        </Typography>
        <Typography variant="caption" display="block">
          {activity.scheduledStart ? dayjs(activity.scheduledStart).format("h:mm A") : t("noTime")}
          {activity.scheduledStart && activity.scheduledEnd && (
            <>
              {" • "}
              {dayjs(activity.scheduledEnd).diff(dayjs(activity.scheduledStart), "minute")} min
            </>
          )}
          {(Number(activity.estimatedCost) > 0 || Number(activity.actualCost) > 0) && (
            <>
              {" • "}
              {activity.currency}${Number(activity.actualCost || activity.estimatedCost).toFixed(0)}
            </>
          )}
        </Typography>
      </Box>
      <Box display="flex" alignItems="center">
        {!isAvailable && (
          <Tooltip
            title={`${t("warning")}: ${t("notAvailableOn")} ${t(
              dayjs(activity.scheduledStart || activity.tripDay?.date)
                .format("dddd")
                .toLowerCase() as any,
            )}. ${t("availableDaysLabel")}: ${activity.availableDays
              ?.map((d) => t(d.toLowerCase() as any))
              .join(", ")}`}
          >
            <Warning color="warning" fontSize="small" sx={{ mr: 1 }} />
          </Tooltip>
        )}
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
            <Tooltip title={t("flyToLocation")}>
              <IconButton size="small" onClick={() => onFlyTo && onFlyTo(activity)} sx={{ mr: 0.5 }} color="primary">
                <NearMe fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          {canEdit && (
            <>
              <Tooltip title={t("copyActivity")}>
                <IconButton
                  size="small"
                  onClick={(e) => {
                    if (onCopy) {
                      setCopyMenuAnchor(e.currentTarget)
                    }
                  }}
                  sx={{ mr: 0.5 }}
                >
                  <ContentCopy fontSize="small" />
                </IconButton>
              </Tooltip>
              <Menu anchorEl={copyMenuAnchor} open={Boolean(copyMenuAnchor)} onClose={() => setCopyMenuAnchor(null)}>
                <MenuItem
                  onClick={() => {
                    onCopy?.(activity, false)
                    setCopyMenuAnchor(null)
                  }}
                >
                  <ListItemIcon>
                    <ContentCopy fontSize="small" />
                  </ListItemIcon>
                  <ListItemText>{t("copyActivity")}</ListItemText>
                </MenuItem>
                <MenuItem
                  onClick={() => {
                    onCopy?.(activity, true)
                    setCopyMenuAnchor(null)
                  }}
                >
                  <ListItemIcon>
                    <ContentCopy fontSize="small" />
                  </ListItemIcon>
                  <ListItemText>{t("copyActivityAsLink")}</ListItemText>
                </MenuItem>
              </Menu>
              <Tooltip title={t("editActivity")}>
                <IconButton size="small" onClick={() => onEdit(activity)} sx={{ mr: 0.5 }}>
                  <EditIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title={t("deleteActivity")}>
                <IconButton size="small" onClick={() => onDelete(activity.id)} disabled={isDeleting} color="error">
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </>
          )}
        </Box>
      </Box>
    </Paper>
  )
}
