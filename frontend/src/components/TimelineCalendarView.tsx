import { Box, Paper, Typography, Menu, MenuItem, useTheme, useMediaQuery } from "@mui/material"
import dayjs from "dayjs"
import { useMemo, useState } from "react"

import type { Activity, TripDay } from "../types"

interface TimelineCalendarViewProps {
  days: TripDay[]
  onActivityClick?: (activity: Activity) => void
  onActivityUpdate?: (
    activityId: string,
    updates: { scheduledStart?: string; scheduledEnd?: string; tripDayId?: string },
  ) => void
}

// Responsive constants will be set inside component based on breakpoint

// Helper to convert time to pixel position from day start
const getPixelPosition = (time: string, dayStart: string, hourHeight: number): number => {
  const minutes = dayjs(time).diff(dayjs(dayStart).startOf("day"), "minute")
  return (minutes / 60) * hourHeight
}

// Helper to calculate activity height based on duration
const getActivityHeight = (start: string, end: string, hourHeight: number, minHeight: number): number => {
  const durationMinutes = dayjs(end).diff(dayjs(start), "minute")
  const height = (durationMinutes / 60) * hourHeight
  return Math.max(height, minHeight)
}

// Detect if two activities overlap
const activitiesOverlap = (a: Activity, b: Activity): boolean => {
  if (!a.scheduledStart || !a.scheduledEnd || !b.scheduledStart || !b.scheduledEnd) return false
  return (
    dayjs(a.scheduledStart).isBefore(dayjs(b.scheduledEnd)) && dayjs(b.scheduledStart).isBefore(dayjs(a.scheduledEnd))
  )
}

// Group overlapping activities into lanes
const calculateActivityLanes = (activities: Activity[]): Map<string, { lane: number; totalLanes: number }> => {
  const sorted = [...activities].sort((a, b) => {
    if (!a.scheduledStart || !b.scheduledStart) return 0
    return dayjs(a.scheduledStart).diff(dayjs(b.scheduledStart))
  })

  const lanes = new Map<string, { lane: number; totalLanes: number }>()
  const activeLanes: (Activity | null)[] = []

  sorted.forEach((activity) => {
    if (!activity.scheduledStart || !activity.scheduledEnd) return

    // Find first available lane
    let laneIndex = 0
    while (laneIndex < activeLanes.length) {
      const laneActivity = activeLanes[laneIndex]
      if (!laneActivity || !activitiesOverlap(activity, laneActivity)) {
        break
      }
      laneIndex++
    }

    // Assign to lane
    activeLanes[laneIndex] = activity

    // Clean up lanes that have ended
    activeLanes.forEach((laneActivity, idx) => {
      if (
        laneActivity &&
        laneActivity.scheduledEnd &&
        dayjs(laneActivity.scheduledEnd).isBefore(dayjs(activity.scheduledStart))
      ) {
        activeLanes[idx] = null
      }
    })

    // Calculate total active lanes for this activity
    const totalLanes = activeLanes.filter((a) => a !== null).length

    lanes.set(activity.id, { lane: laneIndex, totalLanes })
  })

  return lanes
}

export const TimelineCalendarView = ({ days, onActivityClick, onActivityUpdate }: TimelineCalendarViewProps) => {
  // Responsive breakpoints
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down("md"))

  // Responsive constants
  const HOUR_HEIGHT = isMobile ? 50 : 60
  const MIN_ACTIVITY_HEIGHT = isMobile ? 40 : 20
  const DAY_COLUMN_WIDTH = isMobile ? 150 : 200
  const TIME_RULER_WIDTH = isMobile ? 50 : 60

  const hours = useMemo(() => Array.from({ length: 24 }, (_, i) => i), [])
  const [dragPreview, setDragPreview] = useState<{
    dayId: string
    yPosition: number
    time: string
    duration: number
  } | null>(null)
  const [draggedActivityId, setDraggedActivityId] = useState<string | null>(null)
  const [contextMenu, setContextMenu] = useState<{
    mouseX: number
    mouseY: number
    dayId: string
    time: string
  } | null>(null)
  const [expandedActivityId, setExpandedActivityId] = useState<string | null>(null)

  const handleActivityDragStart = (e: React.DragEvent, activity: Activity) => {
    e.dataTransfer.effectAllowed = "move"
    e.dataTransfer.setData("application/json", JSON.stringify(activity))
    sessionStorage.setItem("draggedActivity", JSON.stringify(activity))
    setDraggedActivityId(activity.id)
  }

  const handleActivityDragEnd = () => {
    // Reset dragged activity state when drag ends (whether dropped or cancelled)
    setDraggedActivityId(null)
    setDragPreview(null)
    sessionStorage.removeItem("draggedActivity")
  }

  const handleDayDrop = (e: React.DragEvent, day: TripDay) => {
    e.preventDefault()
    setDragPreview(null)
    setDraggedActivityId(null)
    sessionStorage.removeItem("draggedActivity")
    const activityData = e.dataTransfer.getData("application/json")
    if (!activityData || !onActivityUpdate) return

    const activity: Activity = JSON.parse(activityData)
    const rect = e.currentTarget.getBoundingClientRect()
    const yOffset = e.clientY - rect.top - 60 // Subtract header height
    const minutesFromDayStart = Math.max(0, (yOffset / HOUR_HEIGHT) * 60)

    // Calculate new start time
    const newStart = dayjs(day.date).startOf("day").add(minutesFromDayStart, "minute")

    // Calculate duration and new end time
    const duration =
      activity.scheduledStart && activity.scheduledEnd
        ? dayjs(activity.scheduledEnd).diff(dayjs(activity.scheduledStart), "minute")
        : 60 // Default 1 hour
    const newEnd = newStart.add(duration, "minute")

    onActivityUpdate(activity.id, {
      scheduledStart: newStart.toISOString(),
      scheduledEnd: newEnd.toISOString(),
      tripDayId: day.id,
    })
  }

  const handleDragOver = (e: React.DragEvent, day: TripDay) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"

    const rect = e.currentTarget.getBoundingClientRect()
    const yOffset = e.clientY - rect.top - 60
    const minutesFromDayStart = Math.max(0, (yOffset / HOUR_HEIGHT) * 60)
    const newStart = dayjs(day.date).startOf("day").add(minutesFromDayStart, "minute")

    let duration = 60
    try {
      const data = sessionStorage.getItem("draggedActivity")
      if (data) {
        const activity = JSON.parse(data)
        if (activity.scheduledStart && activity.scheduledEnd) {
          duration = dayjs(activity.scheduledEnd).diff(dayjs(activity.scheduledStart), "minute")
        }
      }
    } catch {
      // Ignore
    }

    setDragPreview({
      dayId: day.id,
      yPosition: Math.max(0, yOffset),
      time: newStart.format("HH:mm"),
      duration,
    })
  }

  const handleDragLeave = () => {
    setDragPreview(null)
  }

  const handleContextMenu = (e: React.MouseEvent, day: TripDay) => {
    e.preventDefault()
    const rect = e.currentTarget.getBoundingClientRect()
    const yOffset = e.clientY - rect.top - 60
    const minutesFromDayStart = Math.max(0, (yOffset / HOUR_HEIGHT) * 60)
    const time = dayjs(day.date).startOf("day").add(minutesFromDayStart, "minute")

    setContextMenu({
      mouseX: e.clientX,
      mouseY: e.clientY,
      dayId: day.id,
      time: time.toISOString(),
    })
  }

  const handleCloseContextMenu = () => {
    setContextMenu(null)
  }

  const handleAddActivityFromContext = () => {
    if (contextMenu && onActivityClick) {
      // Create a temporary activity object for the dialog
      const newActivity = {
        id: "",
        tripDayId: contextMenu.dayId,
        scheduledStart: contextMenu.time,
        scheduledEnd: dayjs(contextMenu.time).add(1, "hour").toISOString(),
      } as Activity
      onActivityClick(newActivity)
    }
    handleCloseContextMenu()
  }

  return (
    <Box
      sx={{
        display: "flex",
        height: isMobile ? "calc(100vh - 200px)" : "calc(100vh - 250px)",
        maxHeight: isMobile ? "calc(100vh - 200px)" : "calc(100vh - 250px)",
        overflow: "auto",
        position: "relative",
        "&::-webkit-scrollbar": {
          height: isMobile ? 10 : 14,
          width: isMobile ? 10 : 14,
        },
        "&::-webkit-scrollbar-track": {
          bgcolor: "grey.200",
        },
        "&::-webkit-scrollbar-thumb": {
          bgcolor: "grey.400",
          borderRadius: 1,
          "&:hover": {
            bgcolor: "grey.500",
          },
        },
      }}
    >
      {/* Day Columns */}
      <Box sx={{ display: "flex", flexGrow: 1, position: "relative" }}>
        {days.map((day) => {
          const dayActivities = (day.activities || []).filter((a) => a.scheduledStart && a.scheduledEnd)
          const lanes = calculateActivityLanes(dayActivities)

          return (
            <Box
              key={day.id}
              onDrop={(e) => handleDayDrop(e, day)}
              onDragOver={(e) => handleDragOver(e, day)}
              onDragLeave={handleDragLeave}
              onContextMenu={(e) => handleContextMenu(e, day)}
              sx={{
                width: DAY_COLUMN_WIDTH,
                minWidth: DAY_COLUMN_WIDTH,
                minHeight: HOUR_HEIGHT * 24 + 60, // 24 hours + header height
                borderRight: "1px solid #e0e0e0",
                position: "relative",
                flexShrink: 0,
              }}
            >
              {/* Day Header */}
              <Paper
                sx={{
                  p: 1,
                  textAlign: "center",
                  position: "sticky",
                  top: 0,
                  zIndex: 10,
                  bgcolor: "background.paper",
                  borderBottom: "2px solid #e0e0e0",
                }}
              >
                <Typography variant="subtitle2" fontWeight="bold">
                  {day.name || `Day ${day.dayIndex + 1}`}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {dayjs(day.date).format("MMM D")}
                </Typography>
              </Paper>

              {/* Hour Grid Lines */}
              <Box sx={{ position: "relative", height: HOUR_HEIGHT * 24, minHeight: HOUR_HEIGHT * 24 }}>
                {hours.map((hour) => (
                  <Box
                    key={hour}
                    sx={{
                      position: "absolute",
                      top: hour * HOUR_HEIGHT,
                      left: 0,
                      right: 0,
                      height: HOUR_HEIGHT,
                      borderTop: "1px solid #f0f0f0",
                    }}
                  />
                ))}

                {/* Activities */}
                {dayActivities.map((activity) => {
                  const laneInfo = lanes.get(activity.id)
                  if (!laneInfo || !activity.scheduledStart || !activity.scheduledEnd) return null

                  const top = getPixelPosition(activity.scheduledStart, day.date, HOUR_HEIGHT)
                  const height = getActivityHeight(
                    activity.scheduledStart,
                    activity.scheduledEnd,
                    HOUR_HEIGHT,
                    MIN_ACTIVITY_HEIGHT,
                  )
                  const gapSize = 2
                  const width = 100 / laneInfo.totalLanes - (gapSize * (laneInfo.totalLanes - 1)) / laneInfo.totalLanes
                  const left =
                    (laneInfo.lane * 100) / laneInfo.totalLanes + (laneInfo.lane * gapSize) / laneInfo.totalLanes

                  // Check if this activity is being dragged or expanded
                  const isDragging = activity.id === draggedActivityId
                  const isExpanded = activity.id === expandedActivityId

                  // Calculate display height (expanded cards get more space)
                  const displayHeight = isExpanded ? Math.max(height, 80) : Math.max(height, isMobile ? 25 : 20)

                  return (
                    <Paper
                      key={activity.id}
                      draggable
                      onDragStart={(e) => handleActivityDragStart(e, activity)}
                      onDragEnd={handleActivityDragEnd}
                      tabIndex={0}
                      onMouseOver={() => {
                        if (displayHeight < 60) setExpandedActivityId(activity.id)
                      }}
                      onBlur={() => setExpandedActivityId(null)}
                      onMouseOut={() => setExpandedActivityId(null)}
                      onClick={() => {
                        onActivityClick?.(activity)
                      }}
                      sx={{
                        position: "absolute",
                        top: `${top}px`,
                        left: `${left}%`,
                        width: `${width}%`,
                        height: `${displayHeight}px`,
                        minHeight: isMobile ? 44 : 20,
                        p: isMobile ? 0.4 : 0.5,
                        cursor: "pointer",
                        bgcolor: "primary.light",
                        color: "primary.contrastText",
                        overflow: "hidden",
                        opacity: isDragging ? 0.3 : 1,
                        zIndex: isExpanded ? 100 : 1,
                        boxShadow: isExpanded ? 6 : 1,
                        "&:hover": {
                          bgcolor: "primary.main",
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
                        sx={{ display: "block", lineHeight: 1.2, mb: 0.25, fontSize: isMobile ? "0.7rem" : "0.75rem" }}
                      >
                        {activity.name}
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{ fontSize: isMobile ? "0.6rem" : "0.65rem", opacity: 0.9, display: "block" }}
                      >
                        {dayjs(activity.scheduledStart).format("HH:mm")} -{" "}
                        {dayjs(activity.scheduledEnd).format("HH:mm")}
                      </Typography>
                      {activity.city && (
                        <Typography variant="caption" sx={{ fontSize: "0.6rem", opacity: 0.85, display: "block" }}>
                          📍 {activity.city}
                        </Typography>
                      )}
                      {(isExpanded || displayHeight > 60) && activity.activityType && (
                        <Typography
                          variant="caption"
                          sx={{ fontSize: "0.6rem", opacity: 0.8, display: "block", mt: 0.25 }}
                        >
                          {activity.activityType}
                        </Typography>
                      )}
                    </Paper>
                  )
                })}

                {/* Drag Preview */}
                {dragPreview && dragPreview.dayId === day.id && (
                  <Box
                    sx={{
                      position: "absolute",
                      top: `${dragPreview.yPosition}px`,
                      left: 0,
                      right: 0,
                      height: `${(dragPreview.duration / 60) * HOUR_HEIGHT}px`,
                      bgcolor: "rgba(25, 118, 210, 0.4)",
                      border: "2px solid #1976d2",
                      borderRadius: 1,
                      pointerEvents: "none",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "flex-start",
                      zIndex: 1000,
                      pt: 1,
                    }}
                  >
                    <Typography
                      variant="caption"
                      fontWeight="bold"
                      sx={{
                        color: "white",
                        bgcolor: "primary.dark",
                        px: 1,
                        py: 0.25,
                        borderRadius: 0.5,
                        boxShadow: 2,
                        mb: 0.5,
                      }}
                    >
                      {dragPreview.time}
                    </Typography>
                  </Box>
                )}
              </Box>
            </Box>
          )
        })}
      </Box>

      {/* Time Ruler (Fixed on Right) */}
      <Box
        sx={{
          width: TIME_RULER_WIDTH,
          minWidth: TIME_RULER_WIDTH,
          borderLeft: "2px solid #e0e0e0",
          position: "sticky",
          right: 0,
          bgcolor: "background.paper",
          flexShrink: 0,
        }}
      >
        {/* Header Spacer */}
        <Box sx={{ height: 60, borderBottom: "2px solid #e0e0e0" }} />

        {/* Hour Labels */}
        <Box sx={{ position: "relative", height: HOUR_HEIGHT * 24 }}>
          {hours.map((hour) => (
            <Box
              key={hour}
              sx={{
                position: "absolute",
                top: hour * HOUR_HEIGHT,
                left: 0,
                right: 0,
                height: HOUR_HEIGHT,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderTop: "1px solid #f0f0f0",
              }}
            >
              <Typography variant="caption" color="text.secondary" fontWeight="medium">
                {hour.toString().padStart(2, "0")}:00
              </Typography>
            </Box>
          ))}
        </Box>
      </Box>

      {/* Context Menu */}
      <Menu
        open={contextMenu !== null}
        onClose={handleCloseContextMenu}
        anchorReference="anchorPosition"
        anchorPosition={contextMenu !== null ? { top: contextMenu.mouseY, left: contextMenu.mouseX } : undefined}
      >
        <MenuItem onClick={handleAddActivityFromContext}>
          Add Activity at {contextMenu && dayjs(contextMenu.time).format("HH:mm")}
        </MenuItem>
      </Menu>
    </Box>
  )
}
