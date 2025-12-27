import { Paper, Typography } from "@mui/material"
import dayjs from "dayjs"

import type { Activity } from "../../types"

import { getPixelPosition, getActivityHeight } from "./TimelineUtils"

interface TimelineActivityCardProps {
  activity: Activity
  dayDate: string
  laneInfo: { lane: number; totalLanes: number }
  hourHeight: number
  minActivityHeight: number
  isMobile: boolean
  isDragging: boolean
  isExpanded: boolean
  onDragStart: (e: React.DragEvent, activity: Activity) => void
  onDragEnd: () => void
  onExpand: (id: string | null) => void
  onClick: (activity: Activity) => void
  onContextMenu: (e: React.MouseEvent, activityId: string) => void
  isConflicting?: boolean
  theme: any // Using any for theme to avoid complex MUI theme typing if not strictly needed
}

export const TimelineActivityCard = ({
  activity,
  dayDate,
  laneInfo,
  hourHeight,
  minActivityHeight,
  isMobile,
  isDragging,
  isExpanded,
  onDragStart,
  onDragEnd,
  onExpand,
  onClick,
  onContextMenu,
  isConflicting,
  theme,
}: TimelineActivityCardProps) => {
  if (!activity.scheduledStart) return null

  const effectiveEnd = activity.scheduledEnd || dayjs(activity.scheduledStart).endOf("day").toISOString()
  const hasNoEndTime = !activity.scheduledEnd

  const top = getPixelPosition(activity.scheduledStart, dayDate, hourHeight)
  const height = getActivityHeight(activity.scheduledStart, effectiveEnd, hourHeight, minActivityHeight)

  const gapSize = 2
  const width = 100 / laneInfo.totalLanes - (gapSize * (laneInfo.totalLanes - 1)) / laneInfo.totalLanes
  const left = (laneInfo.lane * 100) / laneInfo.totalLanes + (laneInfo.lane * gapSize) / laneInfo.totalLanes

  const displayHeight = isExpanded ? Math.max(height, 80) : Math.max(height, isMobile ? 25 : 20)

  return (
    <Paper
      draggable
      onDragStart={(e) => onDragStart(e, activity)}
      onDragEnd={onDragEnd}
      tabIndex={0}
      onMouseOver={() => {
        if (displayHeight < 60) onExpand(activity.id)
      }}
      onBlur={() => onExpand(null)}
      onMouseOut={() => onExpand(null)}
      onClick={() => onClick(activity)}
      onContextMenu={(e) => onContextMenu(e, activity.id)}
      sx={{
        position: "absolute",
        top: `${top}px`,
        left: `${left}%`,
        width: `${width}%`,
        height: `${displayHeight}px`,
        minHeight: isMobile ? 44 : 20,
        p: isMobile ? 0.4 : 0.5,
        cursor: "pointer",
        bgcolor: isConflicting ? "#ffebee" : "primary.light",
        background: isConflicting
          ? `repeating-linear-gradient(
            45deg,
            #ffebee,
            #ffebee 10px,
            #ffcdd2 10px,
            #ffcdd2 20px
          )`
          : hasNoEndTime
            ? `repeating-linear-gradient(
            45deg,
            ${theme.palette.primary.light},
            ${theme.palette.primary.light} 10px,
            ${theme.palette.primary.main} 10px,
            ${theme.palette.primary.main} 20px
          )`
            : "primary.light",
        color: isConflicting ? "error.main" : "primary.contrastText",
        border: isConflicting ? "1px solid" : "none",
        borderColor: "error.main",
        overflow: "hidden",
        opacity: isDragging ? 0.3 : 1,
        zIndex: isExpanded ? 100 : 1,
        boxShadow: isExpanded ? 6 : 1,
        "&:hover": {
          bgcolor: isConflicting ? "#fce4ec" : "primary.main",
          background: isConflicting
            ? `repeating-linear-gradient(
              45deg,
              #fce4ec,
              #fce4ec 10px,
              #f8bbd0 10px,
              #f8bbd0 20px
            )`
            : hasNoEndTime
              ? `repeating-linear-gradient(
              45deg,
              ${theme.palette.primary.main},
              ${theme.palette.primary.main} 10px,
              ${theme.palette.primary.dark} 10px,
              ${theme.palette.primary.dark} 20px
            )`
              : "primary.main",
          zIndex: isExpanded ? 101 : 5,
          transform: isMobile ? "none" : "scale(1.02)",
          boxShadow: isExpanded ? 8 : 3,
        },
        transition: "all 0.2s ease-in-out",
        outline: "none",
        "&:focus": {
          boxShadow: (theme) => `0 0 0 2px ${theme.palette.primary.main}`,
        },
      }}
    >
      <Typography
        variant="caption"
        fontWeight="bold"
        sx={{
          display: "block",
          lineHeight: 1.2,
          mb: 0.25,
          fontSize: isMobile ? "0.7rem" : "0.75rem",
        }}
      >
        {activity.name}
      </Typography>
      <Typography variant="caption" sx={{ fontSize: isMobile ? "0.6rem" : "0.65rem", opacity: 0.9, display: "block" }}>
        {dayjs(activity.scheduledStart).format("HH:mm")} -{" "}
        {hasNoEndTime ? "24:00" : dayjs(activity.scheduledEnd).format("HH:mm")}
      </Typography>
      {activity.city && (
        <Typography variant="caption" sx={{ fontSize: "0.6rem", opacity: 0.85, display: "block" }}>
          📍 {activity.city}
        </Typography>
      )}
      {(isExpanded || displayHeight > 60) && activity.activityType && (
        <Typography variant="caption" sx={{ fontSize: "0.6rem", opacity: 0.8, display: "block", mt: 0.25 }}>
          {activity.activityType}
        </Typography>
      )}
    </Paper>
  )
}
