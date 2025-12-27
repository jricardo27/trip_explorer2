import { Box, useTheme, useMediaQuery } from "@mui/material"
import dayjs from "dayjs"
import { useMemo, useState } from "react"

import type { Activity, TripDay, TransportAlternative, TripMember } from "../types"

import { TimelineDayColumn } from "./Timeline/TimelineDayColumn"
import { DayOperationDialog, ScenarioDialog, TimelineContextMenu, DayOptionsMenu } from "./Timeline/TimelineDialogs"
import { TimelineHourLabels } from "./Timeline/TimelineHourLabels"

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
  exchangeRates?: Record<string, number>
  baseCurrency?: string
  members?: TripMember[]
  isPublic?: boolean
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
  exchangeRates = {},
  baseCurrency = "USD",
  members = [],
  isPublic = false,
}: TimelineCalendarViewProps) => {
  // Responsive breakpoints
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down("md"))

  // Responsive constants
  const HOUR_HEIGHT = isMobile ? 50 : 60
  const MIN_ACTIVITY_HEIGHT = isMobile ? 40 : 20
  const DAY_COLUMN_WIDTH = isMobile ? 150 : 200
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
    activityId?: string
  } | null>(null)
  const [expandedActivityId, setExpandedActivityId] = useState<string | null>(null)

  // Scenario Dialog State
  const [scenarioDialog, setScenarioDialog] = useState<{
    open: boolean
    mode: "create" | "rename"
    dayId: string
    scenarioId?: string
    initialName?: string
  }>({ open: false, mode: "create", dayId: "" })
  const [scenarioNameInput, setScenarioNameInput] = useState("")

  // Day Menu Logic
  const [dayMenuAnchor, setDayMenuAnchor] = useState<{ el: HTMLElement; dayId: string } | null>(null)
  const [dayOpDialog, setDayOpDialog] = useState<{ type: "move_all" | "swap" | "rename"; dayId: string } | null>(null)
  const [targetDayId, setTargetDayId] = useState("")
  const [newName, setNewName] = useState("")

  // Comparison Mode State
  const [comparisonDayId, setComparisonDayId] = useState<string | null>(null)

  const handleToggleComparison = (dayId: string) => {
    setComparisonDayId((current) => (current === dayId ? null : dayId))
  }

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
    const headerElement = document.querySelector(`[data-header-id="header-${day.id}"]`)
    const headerHeight = headerElement ? headerElement.getBoundingClientRect().height : DAY_HEADER_HEIGHT

    const yOffset = e.clientY - rect.top - headerHeight
    const minutesFromDayStart = Math.max(0, (yOffset / HOUR_HEIGHT) * 60)
    const newStart = dayjs(day.date).startOf("day").add(minutesFromDayStart, "minute")

    const duration =
      activity.scheduledStart && activity.scheduledEnd
        ? dayjs(activity.scheduledEnd).diff(dayjs(activity.scheduledStart), "minute")
        : 60
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
      /* ignore */
    }

    setDragPreview({
      dayId: day.id,
      yPosition: Math.max(0, yOffset),
      time: newStart.format("HH:mm"),
      duration,
    })
  }

  const handleDragLeave = () => setDragPreview(null)

  const handleContextMenu = (e: React.MouseEvent, day: TripDay, activityId?: string) => {
    e.preventDefault()
    e.stopPropagation()
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

  const handleAddActivityFromContext = () => {
    if (contextMenu && onActivityClick) {
      onActivityClick({
        id: "",
        tripDayId: contextMenu.dayId,
        scheduledStart: contextMenu.time,
        scheduledEnd: dayjs(contextMenu.time).add(1, "hour").toISOString(),
      } as Activity)
    }
    setContextMenu(null)
  }

  const handleCopyActivity = (asLink: boolean) => {
    if (contextMenu?.activityId && onActivityCopy) {
      onActivityCopy(contextMenu.activityId, asLink)
    }
    setContextMenu(null)
  }

  const handleOpenCreateScenario = (dayId: string) => {
    setScenarioDialog({ open: true, mode: "create", dayId })
    setScenarioNameInput("")
  }

  const handleOpenRenameScenario = (dayId: string, scenarioId: string, currentName: string) => {
    setScenarioDialog({ open: true, mode: "rename", dayId, scenarioId })
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

  const handleDayMenuOpen = (e: React.MouseEvent<HTMLElement>, dayId: string) => {
    e.stopPropagation()
    setDayMenuAnchor({ el: e.currentTarget, dayId })
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
    } catch (e) {
      console.error(e)
    }
  }

  return (
    <>
      <TimelineContextMenu
        anchorEl={contextMenu}
        onClose={() => setContextMenu(null)}
        onAddActivity={handleAddActivityFromContext}
        onCopyActivity={handleCopyActivity}
        isActivity={!!contextMenu?.activityId}
      />

      <DayOptionsMenu
        anchorEl={dayMenuAnchor?.el || null}
        open={Boolean(dayMenuAnchor)}
        onClose={() => setDayMenuAnchor(null)}
        onOperation={(type: "move_all" | "swap" | "rename") => {
          if (dayMenuAnchor) {
            setDayOpDialog({ type, dayId: dayMenuAnchor.dayId })
            setTargetDayId("")
            setNewName("")
            if (type === "rename") {
              const day = days.find((d) => d.id === dayMenuAnchor.dayId)
              if (day) setNewName(day.name || "")
            }
            setDayMenuAnchor(null)
          }
        }}
      />

      <DayOperationDialog
        open={Boolean(dayOpDialog)}
        onClose={() => setDayOpDialog(null)}
        type={dayOpDialog?.type || null}
        dayId={dayOpDialog?.dayId || ""}
        targetDayId={targetDayId}
        setTargetDayId={setTargetDayId}
        newName={newName}
        setNewName={setNewName}
        days={days}
        onSubmit={handleDayOpSubmit}
      />

      <ScenarioDialog
        open={scenarioDialog.open}
        onClose={() => setScenarioDialog({ ...scenarioDialog, open: false })}
        mode={scenarioDialog.mode}
        name={scenarioNameInput}
        setName={setScenarioNameInput}
        onSubmit={handleScenarioDialogSubmit}
      />

      <Box
        sx={{
          display: "flex",
          height: isMobile ? "calc(100vh - 200px)" : "calc(95vh - 250px)",
          maxHeight: isMobile ? "calc(100vh - 200px)" : "calc(95vh - 250px)",
          overflow: "auto",
          position: "relative",
          "&::-webkit-scrollbar": { height: isMobile ? 10 : 12, width: isMobile ? 10 : 12 },
          "&::-webkit-scrollbar-track": { bgcolor: "grey.200" },
          "&::-webkit-scrollbar-thumb": { bgcolor: "grey.400", borderRadius: 1, "&:hover": { bgcolor: "grey.500" } },
        }}
      >
        <Box sx={{ display: "flex", flexGrow: 1, position: "relative" }}>
          {days.map((day) => (
            <TimelineDayColumn
              key={day.id}
              day={day}
              transport={transport}
              hours={hours}
              dayColumnWidth={DAY_COLUMN_WIDTH}
              hourHeight={HOUR_HEIGHT}
              dayHeaderHeight={DAY_HEADER_HEIGHT}
              minActivityHeight={MIN_ACTIVITY_HEIGHT}
              isMobile={isMobile}
              theme={theme}
              draggedActivityId={draggedActivityId}
              expandedActivityId={expandedActivityId}
              setExpandedActivityId={setExpandedActivityId}
              handleDayDrop={handleDayDrop}
              handleDragOver={handleDragOver}
              handleDragLeave={handleDragLeave}
              handleContextMenu={handleContextMenu}
              handleActivityDragStart={handleActivityDragStart}
              handleActivityDragEnd={handleActivityDragEnd}
              onActivityClick={onActivityClick}
              onTransportClick={onTransportClick}
              onScenarioChange={onScenarioChange}
              handleOpenCreateScenario={handleOpenCreateScenario}
              handleOpenRenameScenario={handleOpenRenameScenario}
              handleDayMenuOpen={handleDayMenuOpen}
              dragPreview={dragPreview ? { ...dragPreview, top: dragPreview.yPosition } : null}
              isComparisonMode={comparisonDayId === day.id}
              onToggleComparison={handleToggleComparison}
              exchangeRates={exchangeRates}
              baseCurrency={baseCurrency}
              members={members}
              isPublic={isPublic}
            />
          ))}
        </Box>

        <TimelineHourLabels hours={hours} hourHeight={HOUR_HEIGHT} headerHeight={DAY_HEADER_HEIGHT} />
      </Box>
    </>
  )
}
