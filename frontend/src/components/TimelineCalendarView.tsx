import {
  DirectionsCar,
  DirectionsBus,
  DirectionsWalk,
  Train,
  Flight,
  DirectionsBoat,
  PedalBike,
  MoreVert,
  Edit,
} from "@mui/icons-material"
import {
  Box,
  Paper,
  Typography,
  Menu,
  MenuItem,
  useTheme,
  useMediaQuery,
  Tooltip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  Button,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  TextField,
} from "@mui/material"
import dayjs from "dayjs"
import { useMemo, useState } from "react"

import { useLanguageStore } from "../stores/languageStore"
import { TransportMode } from "../types"
import type { Activity, TripDay, TransportAlternative } from "../types"

interface TimelineCalendarViewProps {
  days: TripDay[]
  transport?: TransportAlternative[]
  onActivityClick?: (activity: Activity) => void
  onTransportClick?: (transport: TransportAlternative) => void
  onActivityUpdate?: (
    activityId: string,
    updates: { scheduledStart?: string; scheduledEnd?: string; tripDayId?: string },
  ) => void
  onActivityCopy?: (activityId: string, asLink?: boolean) => void
  onDayOperation?: (type: "move_all" | "swap" | "rename", dayId: string, payload: any) => Promise<void>
  onScenarioChange?: (dayId: string, scenarioId: string | null) => void
  onCreateScenario?: (dayId: string, name: string) => void
  onRenameScenario?: (dayId: string, scenarioId: string, newName: string) => void
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
  if (!a.scheduledStart || !b.scheduledStart) return false
  const aEnd = a.scheduledEnd || dayjs(a.scheduledStart).endOf("day").toISOString()
  const bEnd = b.scheduledEnd || dayjs(b.scheduledStart).endOf("day").toISOString()
  return dayjs(a.scheduledStart).isBefore(dayjs(bEnd)) && dayjs(b.scheduledStart).isBefore(dayjs(aEnd))
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
    if (!activity.scheduledStart) return

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
        dayjs(laneActivity.scheduledEnd || dayjs(laneActivity.scheduledStart).endOf("day")).isBefore(
          dayjs(activity.scheduledStart),
        )
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

const getTransportIcon = (mode: TransportMode) => {
  switch (mode) {
    case TransportMode.DRIVING:
      return <DirectionsCar fontSize="small" />
    case TransportMode.WALKING:
      return <DirectionsWalk fontSize="small" />
    case TransportMode.CYCLING:
      return <PedalBike fontSize="small" />
    case TransportMode.TRANSIT:
      return <DirectionsBus fontSize="small" />
    case TransportMode.BUS:
      return <DirectionsBus fontSize="small" />
    case TransportMode.TRAIN:
      return <Train fontSize="small" />
    case TransportMode.FLIGHT:
      return <Flight fontSize="small" />
    case TransportMode.FERRY:
      return <DirectionsBoat fontSize="small" />
    default:
      return <DirectionsCar fontSize="small" />
  }
}

export const TimelineCalendarView = ({
  days,
  transport,
  onActivityClick,
  onTransportClick,
  onActivityUpdate,
  onActivityCopy,
  onDayOperation,
  onScenarioChange,
  onCreateScenario,
  onRenameScenario,
}: TimelineCalendarViewProps) => {
  // Responsive breakpoints
  const { t } = useLanguageStore()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down("md"))

  // Responsive constants
  const HOUR_HEIGHT = isMobile ? 50 : 60
  const MIN_ACTIVITY_HEIGHT = isMobile ? 40 : 20
  const DAY_COLUMN_WIDTH = isMobile ? 150 : 200
  const TIME_RULER_WIDTH = isMobile ? 50 : 60
  const DAY_HEADER_HEIGHT = 145 // Matches minHeight in day header Paper component

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
    activityId?: string // Optional, if clicked on an activity
  } | null>(null)
  const [expandedActivityId, setExpandedActivityId] = useState<string | null>(null)

  const handleActivityDragStart = (e: React.DragEvent, activity: Activity) => {
    if (activity.isLocked) {
      e.preventDefault()
      return
    }
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

    // Calculate dynamic header height
    const headerElement = document.querySelector(`[data-header-id="header-${day.id}"]`)
    const headerHeight = headerElement ? headerElement.getBoundingClientRect().height : DAY_HEADER_HEIGHT

    const yOffset = e.clientY - rect.top - headerHeight
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

    // Calculate dynamic header height
    const headerElement = document.querySelector(`[data-header-id="header-${day.id}"]`)
    const headerHeight = headerElement ? headerElement.getBoundingClientRect().height : DAY_HEADER_HEIGHT

    const yOffset = e.clientY - rect.top - headerHeight
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

  const handleContextMenu = (e: React.MouseEvent, day: TripDay, activityId?: string) => {
    e.preventDefault()
    e.stopPropagation() // Prevent bubbling
    const rect = e.currentTarget.getBoundingClientRect()
    const yOffset = e.clientY - rect.top - 60
    const minutesFromDayStart = Math.max(0, (yOffset / HOUR_HEIGHT) * 60)
    const time = dayjs(day.date).startOf("day").add(minutesFromDayStart, "minute")

    setContextMenu({
      mouseX: e.clientX,
      mouseY: e.clientY,
      dayId: day.id,
      time: time.toISOString(),
      activityId,
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

  const handleCopyActivity = (asLink: boolean) => {
    if (contextMenu?.activityId && onActivityCopy) {
      onActivityCopy(contextMenu.activityId, asLink)
    }
    handleCloseContextMenu()
  }

  // Scenario Dialog State
  const [scenarioDialog, setScenarioDialog] = useState<{
    open: boolean
    mode: "create" | "rename"
    dayId: string
    scenarioId?: string
    initialName?: string
  }>({ open: false, mode: "create", dayId: "" })
  const [scenarioNameInput, setScenarioNameInput] = useState("")

  const handleOpenCreateScenario = (dayId: string) => {
    setScenarioDialog({ open: true, mode: "create", dayId })
    setScenarioNameInput("")
  }

  const handleOpenRenameScenario = (dayId: string, scenarioId: string, currentName: string) => {
    setScenarioDialog({ open: true, mode: "rename", dayId, scenarioId, initialName: currentName })
    setScenarioNameInput(currentName)
  }

  const handleScenarioDialogSubmit = () => {
    const { mode, dayId, scenarioId } = scenarioDialog
    if (!scenarioNameInput.trim()) return

    if (mode === "create" && onCreateScenario) {
      onCreateScenario(dayId, scenarioNameInput)
    } else if (mode === "rename" && onRenameScenario && scenarioId) {
      onRenameScenario(dayId, scenarioId, scenarioNameInput)
    }
    setScenarioDialog({ ...scenarioDialog, open: false })
  }

  // Scroll to hour on mount or update
  // ... (keeping existing scroll logic implicit if not touching it, but I need a unique anchor)

  // Let's use the END of a specific function or the START of Day Menu Logic variables.
  // Viewing file showed Day Menu Logic starts around line 304 in previous views? No, based on context...
  // I'll search for "const [dayMenuAnchor, setDayMenuAnchor]" to be safe.

  // New Content:

  // Day Menu Logic
  const [dayMenuAnchor, setDayMenuAnchor] = useState<{ el: HTMLElement; dayId: string } | null>(null)
  const [dayOpDialog, setDayOpDialog] = useState<{ type: "move_all" | "swap" | "rename"; dayId: string } | null>(null)
  const [targetDayId, setTargetDayId] = useState("")
  const [newName, setNewName] = useState("")

  const handleDayMenuOpen = (e: React.MouseEvent<HTMLElement>, dayId: string) => {
    e.stopPropagation() // Prevent drop logic interference? Header is sticky so maybe fine but good practice
    setDayMenuAnchor({ el: e.currentTarget, dayId })
  }

  const handleDayMenuClose = () => setDayMenuAnchor(null)

  const openDayDialog = (type: "move_all" | "swap" | "rename") => {
    if (dayMenuAnchor) {
      setDayOpDialog({ type, dayId: dayMenuAnchor.dayId })
      setTargetDayId("")
      setNewName("")
      // Pre-fill name if renaming?
      if (type === "rename") {
        const day = days.find((d) => d.id === dayMenuAnchor.dayId)
        if (day) setNewName(day.name || "")
      }
      handleDayMenuClose()
    }
  }

  const handleDayOpSubmit = async () => {
    if (!dayOpDialog || !onDayOperation) return

    try {
      if (dayOpDialog.type === "rename") {
        await onDayOperation("rename", dayOpDialog.dayId, { name: newName })
      } else {
        if (!targetDayId) return
        await onDayOperation(dayOpDialog.type, dayOpDialog.dayId, {
          targetDayId,
          dayId1: dayOpDialog.dayId,
          dayId2: targetDayId,
        })
      }
      setDayOpDialog(null)
    } catch (error) {
      console.error("Day Op Failed", error)
    }
  }

  return (
    <>
      <Menu anchorEl={dayMenuAnchor?.el} open={Boolean(dayMenuAnchor)} onClose={handleDayMenuClose}>
        <MenuItem onClick={() => openDayDialog("move_all")}>{t("moveAllActivities")}...</MenuItem>
        <MenuItem onClick={() => openDayDialog("swap")}>{t("swapDays")}...</MenuItem>
        <MenuItem onClick={() => openDayDialog("rename")}>{t("renameDay")}</MenuItem>
      </Menu>

      <Dialog open={Boolean(dayOpDialog)} onClose={() => setDayOpDialog(null)}>
        <DialogTitle>
          {dayOpDialog?.type === "move_all" && t("moveAllActivities")}
          {dayOpDialog?.type === "swap" && t("swapDays")}
          {dayOpDialog?.type === "rename" && t("renameDay")}
        </DialogTitle>
        <DialogContent sx={{ minWidth: 300, pt: 2 }}>
          {dayOpDialog?.type === "rename" ? (
            <FormControl fullWidth sx={{ mt: 2 }}>
              <TextField
                autoFocus
                label={t("dayName")}
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                fullWidth
              />
            </FormControl>
          ) : (
            <FormControl fullWidth sx={{ mt: 2 }}>
              <InputLabel>{t("targetDay")}</InputLabel>
              <Select value={targetDayId} label={t("targetDay")} onChange={(e) => setTargetDayId(e.target.value)}>
                {days
                  .filter((d) => d.id !== dayOpDialog?.dayId)
                  .map((d) => (
                    <MenuItem key={d.id} value={d.id}>
                      {d.name || `Day ${d.dayIndex !== undefined ? d.dayIndex + 1 : "?"}`} (
                      {dayjs(d.date).format("MMM D")})
                    </MenuItem>
                  ))}
              </Select>
            </FormControl>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDayOpDialog(null)}>{t("cancel")}</Button>
          <Button onClick={handleDayOpSubmit} variant="contained">
            {t("confirm")}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Scenario Create/Rename Dialog */}
      <Dialog open={scenarioDialog.open} onClose={() => setScenarioDialog({ ...scenarioDialog, open: false })}>
        <DialogTitle>{scenarioDialog.mode === "create" ? t("createAlternative") : t("renameScenario")}</DialogTitle>
        <DialogContent sx={{ minWidth: 300, pt: 2 }}>
          <FormControl fullWidth sx={{ mt: 2 }}>
            <TextField
              autoFocus
              label={t("scenarioName")}
              value={scenarioNameInput}
              onChange={(e) => setScenarioNameInput(e.target.value)}
              fullWidth
            />
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setScenarioDialog({ ...scenarioDialog, open: false })}>{t("cancel")}</Button>
          <Button onClick={handleScenarioDialogSubmit} variant="contained">
            {t("confirm")}
          </Button>
        </DialogActions>
      </Dialog>

      <Box
        sx={{
          display: "flex",
          height: isMobile ? "calc(100vh - 200px)" : "calc(95vh - 250px)",
          maxHeight: isMobile ? "calc(100vh - 200px)" : "calc(95vh - 250px)",
          overflow: "auto",
          position: "relative",
          "&::-webkit-scrollbar": {
            height: isMobile ? 10 : 12,
            width: isMobile ? 10 : 12,
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
            // Determine which activities to show: Main Plan (scenarioId=null) or Selected Scenario
            const activeScenario = day.scenarios?.find((s) => s.isSelected)
            const allDayActivities = activeScenario ? activeScenario.activities || [] : day.activities || []

            // Filter for timeline rendering (must have time)
            const dayActivities = allDayActivities.filter((a) => a.scheduledStart)
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
                  minHeight: "100%", // Fill parent
                  height: "max-content", // Allow growth
                  borderRight: "1px solid #e0e0e0",
                  position: "relative",
                  flexShrink: 0,
                  bgcolor: day.scenarios?.some((s) => s.isSelected) ? "#f8faff" : "transparent", // Light blue tint for active scenario
                  backgroundImage: day.scenarios?.some((s) => s.isSelected)
                    ? "repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(25, 118, 210, 0.03) 10px, rgba(25, 118, 210, 0.03) 20px)"
                    : "none",
                }}
              >
                <Paper
                  data-header-id={`header-${day.id}`}
                  elevation={day.scenarios?.some((s) => s.isSelected) ? 2 : 1}
                  sx={{
                    p: 1.5,
                    position: "sticky",
                    top: 0,
                    zIndex: 10,
                    bgcolor: "background.paper",
                    borderBottom: "2px solid",
                    borderBottomColor: day.scenarios?.some((s) => s.isSelected) ? "primary.main" : "#e0e0e0",
                    display: "flex",
                    flexDirection: "column",
                    gap: 1,
                    minHeight: DAY_HEADER_HEIGHT, // Enforce consistent height
                  }}
                >
                  {/* Day Name & Date */}
                  <Box sx={{ textAlign: "center" }}>
                    <Typography variant="subtitle1" fontWeight="bold">
                      {day.name || `Day ${day.dayIndex + 1}`}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {dayjs(day.date).format("MMM D, YYYY")}
                    </Typography>
                  </Box>
                  <FormControl variant="standard" size="small" sx={{ minWidth: 120 }}>
                    <Select
                      value={day.scenarios?.find((s) => s.isSelected)?.id || "main"}
                      displayEmpty
                      onChange={(e) => {
                        const val = e.target.value
                        if (val === "create_new") {
                          handleOpenCreateScenario(day.id)
                        } else {
                          onScenarioChange?.(day.id, val === "main" ? null : val)
                        }
                      }}
                      inputProps={{ "aria-label": "Scenario" }}
                      sx={{
                        "& .MuiSelect-select": { py: 0, fontSize: "0.875rem", fontWeight: "bold" },
                        // Conditional styling for the select text itself could go here
                      }}
                    >
                      <MenuItem value="main">{t("mainPlan") || "Main Plan"}</MenuItem>
                      {day.scenarios?.map((scenario) => (
                        <MenuItem key={scenario.id} value={scenario.id}>
                          {scenario.name}
                        </MenuItem>
                      ))}
                      <MenuItem value="create_new" sx={{ fontStyle: "italic", borderTop: "1px solid #eee" }}>
                        + {t("createAlternative") || "Create Alternative"}
                      </MenuItem>
                    </Select>
                  </FormControl>
                  {/* Rename Button for active custom scenario */}
                  {day.scenarios?.find((s) => s.isSelected) && (
                    <IconButton
                      size="small"
                      onClick={() => {
                        const active = day.scenarios?.find((s) => s.isSelected)
                        if (active) handleOpenRenameScenario(day.id, active.id, active.name)
                      }}
                      sx={{ opacity: 0.6, "&:hover": { opacity: 1 }, p: 0.5, ml: 1 }}
                    >
                      <Edit fontSize="inherit" sx={{ fontSize: "0.875rem" }} />
                    </IconButton>
                  )}
                  <Typography variant="caption" color="text.secondary" display="block">
                    {dayjs(day.date).format("MMM D")}
                  </Typography>
                  {/* Cost Display */}
                  <Typography variant="caption" sx={{ color: "success.main", fontWeight: "bold", fontSize: "0.7rem" }}>
                    {(() => {
                      // Calculate Activity Costs
                      const activityCost = allDayActivities.reduce((sum, a) => {
                        // Fix: Ensure we don't treat null as 0 if it's meant to be unset.
                        const hasActual = a.actualCost !== null && a.actualCost !== undefined
                        const cost = hasActual ? Number(a.actualCost) : Number(a.estimatedCost) || 0
                        return sum + cost
                      }, 0)

                      // Calculate Transport Costs (Starting from this day)
                      const transportCost = (transport || [])
                        .filter((t) => {
                          if (!t.isSelected) return false
                          const fromActivity = dayActivities.find((a) => a.id === t.fromActivityId)
                          return !!fromActivity // If source activity is on this day, count it
                        })
                        .reduce((sum, t) => {
                          return sum + (Number(t.cost) || 0)
                        }, 0)

                      const total = activityCost + transportCost
                      // Identify currency from first activity/transport or default
                      const currency = dayActivities[0]?.currency || "AUD"

                      return total > 0
                        ? `${new Intl.NumberFormat("en-AU", { style: "currency", currency }).format(total)}`
                        : ""
                    })()}
                  </Typography>
                  {/* Cost Display Logic Should Go Here if not already present, or after the Rename Button */}

                  <IconButton
                    size="small"
                    onClick={(e) => handleDayMenuOpen(e, day.id)}
                    sx={{ position: "absolute", right: 2, top: 4 }}
                  >
                    <MoreVert fontSize="small" />
                  </IconButton>
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
                    if (!laneInfo || !activity.scheduledStart) return null

                    const effectiveEnd =
                      activity.scheduledEnd || dayjs(activity.scheduledStart).endOf("day").toISOString()
                    const hasNoEndTime = !activity.scheduledEnd

                    const top = getPixelPosition(activity.scheduledStart, day.date, HOUR_HEIGHT)
                    const height = getActivityHeight(
                      activity.scheduledStart,
                      effectiveEnd,
                      HOUR_HEIGHT,
                      MIN_ACTIVITY_HEIGHT,
                    )
                    const gapSize = 2
                    const width =
                      100 / laneInfo.totalLanes - (gapSize * (laneInfo.totalLanes - 1)) / laneInfo.totalLanes
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
                        onContextMenu={(e) => handleContextMenu(e, day, activity.id)}
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
                          background: hasNoEndTime
                            ? `repeating-linear-gradient(
                              45deg,
                              ${theme.palette.primary.light},
                              ${theme.palette.primary.light} 10px,
                              ${theme.palette.primary.main} 10px,
                              ${theme.palette.primary.main} 20px
                            )`
                            : "primary.light",
                          color: "primary.contrastText",
                          overflow: "hidden",
                          opacity: isDragging ? 0.3 : 1,
                          zIndex: isExpanded ? 100 : 1,
                          boxShadow: isExpanded ? 6 : 1,
                          "&:hover": {
                            bgcolor: "primary.main",
                            background: hasNoEndTime
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
                        <Typography
                          variant="caption"
                          sx={{ fontSize: isMobile ? "0.6rem" : "0.65rem", opacity: 0.9, display: "block" }}
                        >
                          {dayjs(activity.scheduledStart).format("HH:mm")} -{" "}
                          {hasNoEndTime ? "24:00" : dayjs(activity.scheduledEnd).format("HH:mm")}
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

                  {/* Transport Segments */}
                  {(transport || []).map((trans) => {
                    if (!trans.isSelected) return null
                    const fromActivity = dayActivities.find((a) => a.id === trans.fromActivityId)
                    if (!fromActivity || !fromActivity.scheduledStart) return null

                    // Calculate start time based on activity end
                    const startBasis =
                      fromActivity.scheduledEnd || dayjs(fromActivity.scheduledStart).add(1, "hour").toISOString()
                    const startTime = dayjs(startBasis)

                    // Verify if transport starts on this day (should, if fromActivity is here)
                    // Note: dayActivities are filtered to this day.

                    const top = getPixelPosition(startTime.toISOString(), day.date, HOUR_HEIGHT)
                    const height = (trans.durationMinutes / 60) * HOUR_HEIGHT

                    // Position in specific column? For simplicity, we can use a fixed narrow width or overlay
                    // Let's put it on the right side of the activity column
                    const width = 15 // %
                    const left = 85 // %

                    return (
                      <Tooltip key={trans.id} title={`${trans.transportMode}: ${trans.durationMinutes} min`}>
                        <Paper
                          onClick={() => onTransportClick?.(trans)}
                          sx={{
                            position: "absolute",
                            top: `${top}px`,
                            left: `${left}%`,
                            width: `${width}%`,
                            height: `${Math.max(height, 20)}px`,
                            bgcolor: "secondary.light",
                            color: "secondary.contrastText",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            zIndex: 50,
                            cursor: onTransportClick ? "pointer" : "help",
                            border: "1px dashed",
                            borderColor: "secondary.main",
                            overflow: "hidden",
                            "&:hover": onTransportClick
                              ? {
                                  bgcolor: "secondary.main",
                                  transform: "scale(1.05)",
                                }
                              : {},
                          }}
                        >
                          {getTransportIcon(trans.transportMode)}
                        </Paper>
                      </Tooltip>
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
          <Box sx={{ height: DAY_HEADER_HEIGHT, borderBottom: "2px solid #e0e0e0" }} />

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
          {contextMenu?.activityId ? (
            <>
              <MenuItem key="copy" onClick={() => handleCopyActivity(false)}>
                {t("copyActivity")}
              </MenuItem>
              <MenuItem key="copy-link" onClick={() => handleCopyActivity(true)}>
                {t("copyActivityAsLink")}
              </MenuItem>
            </>
          ) : (
            <MenuItem onClick={handleAddActivityFromContext}>
              {t("addActivityAt")} {contextMenu && dayjs(contextMenu.time).format("HH:mm")}
            </MenuItem>
          )}
        </Menu>
      </Box>
    </>
  )
}
