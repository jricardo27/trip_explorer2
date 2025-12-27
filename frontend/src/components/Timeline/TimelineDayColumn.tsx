import { MoreVert } from "@mui/icons-material"
import { Box, IconButton, Typography } from "@mui/material"
import dayjs from "dayjs"

import { useLanguageStore } from "../../stores/languageStore"
import type { Activity, TripDay, TransportAlternative } from "../../types"
import { calculateDayCost } from "../../utils/costUtils"

import { TimelineActivityCard } from "./TimelineActivityCard"
import { TimelineDayHeader } from "./TimelineDayHeader"
import { TimelineHourGrid } from "./TimelineHourGrid"
import { TimelineTransportSegment } from "./TimelineTransportSegment"
import { calculateActivityLanes } from "./TimelineUtils"

interface TimelineDayColumnProps {
  day: TripDay
  transport?: TransportAlternative[]
  hours: number[]
  dayColumnWidth: number
  hourHeight: number
  dayHeaderHeight: number
  minActivityHeight: number
  isMobile: boolean
  theme: any
  draggedActivityId: string | null
  expandedActivityId: string | null
  setExpandedActivityId: (id: string | null) => void
  handleDayDrop: (e: React.DragEvent, day: TripDay) => void
  handleDragOver: (e: React.DragEvent, day: TripDay) => void
  handleDragLeave: () => void
  handleContextMenu: (e: React.MouseEvent, day: TripDay, activityId?: string) => void
  handleActivityDragStart: (e: React.DragEvent, activity: Activity) => void
  handleActivityDragEnd: () => void
  onActivityClick?: (activity: Activity) => void
  onTransportClick?: (transport: TransportAlternative) => void
  onScenarioChange?: (dayId: string, scenarioId: string | null) => void
  handleOpenCreateScenario: (dayId: string) => void
  handleOpenRenameScenario: (dayId: string, scenarioId: string, currentName: string) => void
  handleDayMenuOpen: (e: React.MouseEvent<HTMLElement>, dayId: string) => void
  dragPreview: { dayId: string; top: number; duration: number } | null
  isComparisonMode: boolean
  onToggleComparison: (dayId: string) => void
  isPublic?: boolean
  exchangeRates: Record<string, number>
  baseCurrency: string
}

export const TimelineDayColumn = ({
  day,
  transport,
  hours,
  dayColumnWidth,
  hourHeight,
  dayHeaderHeight,
  minActivityHeight,
  isMobile,
  theme,
  draggedActivityId,
  expandedActivityId,
  setExpandedActivityId,
  handleDayDrop,
  handleDragOver,
  handleDragLeave,
  handleContextMenu,
  handleActivityDragStart,
  handleActivityDragEnd,
  onActivityClick,
  onTransportClick,
  onScenarioChange,
  handleOpenCreateScenario,
  handleOpenRenameScenario,
  handleDayMenuOpen,
  dragPreview,
  isComparisonMode,
  onToggleComparison,
  isPublic = false,
  exchangeRates,
  baseCurrency,
}: TimelineDayColumnProps) => {
  const { t } = useLanguageStore()
  const activeScenario = day.scenarios?.find((s) => s.isSelected)
  const dayActivities = activeScenario ? activeScenario.activities : day.activities || []

  const lanes = calculateActivityLanes(dayActivities)

  // Correctly identify transport segments for THIS day's sequence to avoid duplication in headers
  const sortedDayActivities = [...dayActivities].sort((a, b) => {
    if (!a.scheduledStart || !b.scheduledStart) return 0
    return new Date(a.scheduledStart).getTime() - new Date(b.scheduledStart).getTime()
  })

  const dayTransport = (transport || []).filter((t) => {
    if (!t.isSelected) return false
    return sortedDayActivities.some((activity, index) => {
      if (index >= sortedDayActivities.length - 1) return false
      return t.fromActivityId === activity.id && t.toActivityId === sortedDayActivities[index + 1].id
    })
  })

  const costResult = calculateDayCost(dayActivities, dayTransport, exchangeRates, baseCurrency)

  // Conflict detection: overlapping activities with shared members (or any if no members/everyone)
  const conflictingActivityIds = new Set<string>()
  sortedDayActivities.forEach((activity, i) => {
    for (let j = 0; j < i; j++) {
      const prev = sortedDayActivities[j]
      if (!activity.scheduledStart || !prev.scheduledStart) continue

      // Check overlap
      const start = dayjs(activity.scheduledStart)
      const prevStart = dayjs(prev.scheduledStart)
      const prevEnd = dayjs(prev.scheduledEnd || prevStart.endOf("day"))

      const overlaps = start.isBefore(prevEnd) && prevStart.isBefore(dayjs(activity.scheduledEnd || start.endOf("day")))

      if (overlaps) {
        // Check shared members
        const membersA = activity.participants?.map((p) => p.memberId) || []
        const membersB = prev.participants?.map((p) => p.memberId) || []

        const hasSharedMembers =
          (membersA.length === 0 && membersB.length === 0) || // If no members specified, assume same for both
          membersA.some((m) => membersB.includes(m))

        if (hasSharedMembers) {
          conflictingActivityIds.add(activity.id)
          break
        }
      }
    }
  })

  return (
    <Box
      onDrop={(e) => handleDayDrop(e, day)}
      onDragOver={(e) => handleDragOver(e, day)}
      onDragLeave={handleDragLeave}
      onContextMenu={(e) => handleContextMenu(e, day)}
      sx={{
        width:
          isComparisonMode && day.scenarios && day.scenarios.length > 0
            ? dayColumnWidth * (day.scenarios.length + 1)
            : dayColumnWidth,
        minWidth:
          isComparisonMode && day.scenarios && day.scenarios.length > 0
            ? dayColumnWidth * (day.scenarios.length + 1)
            : dayColumnWidth,
        minHeight: "100%",
        height: "max-content",
        borderRight: "1px solid #e0e0e0",
        position: "relative",
        flexShrink: 0,
        bgcolor: activeScenario ? "#f8faff" : "transparent",
        backgroundImage: activeScenario
          ? "repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(25, 118, 210, 0.03) 10px, rgba(25, 118, 210, 0.03) 20px)"
          : "none",
      }}
    >
      <TimelineDayHeader
        day={day}
        onScenarioChange={onScenarioChange}
        onOpenCreateScenario={handleOpenCreateScenario}
        onOpenRenameScenario={handleOpenRenameScenario}
        costResult={costResult}
        baseCurrency={baseCurrency}
        dayHeaderHeight={dayHeaderHeight}
        isComparisonMode={isComparisonMode}
        onToggleComparison={onToggleComparison}
        isPublic={isPublic}
      />

      <IconButton
        size="small"
        onClick={(e) => handleDayMenuOpen(e, day.id)}
        sx={{ position: "absolute", right: 2, top: 4, zIndex: 11 }}
      >
        <MoreVert fontSize="small" />
      </IconButton>

      <Box sx={{ position: "relative", width: "100%" }}>
        {/* Scenario headers in comparison mode */}
        {isComparisonMode && day.scenarios && day.scenarios.length > 0 && (
          <Box sx={{ display: "flex", borderBottom: "1px solid #eee", bgcolor: "grey.50" }}>
            {[
              { id: "main", name: t("mainPlan") || "Main Plan" },
              ...day.scenarios.map((s) => ({ id: s.id, name: s.name })),
            ].map((scenario) => (
              <Box
                key={scenario.id}
                sx={{
                  width: dayColumnWidth,
                  minWidth: dayColumnWidth,
                  p: 1,
                  textAlign: "center",
                  borderRight: "1px solid #eee",
                  height: 30,
                  boxSizing: "border-box",
                }}
              >
                <Typography variant="caption" fontWeight="bold">
                  {scenario.name}
                </Typography>
              </Box>
            ))}
          </Box>
        )}

        <Box sx={{ position: "relative", width: "100%" }}>
          <TimelineHourGrid hours={hours} hourHeight={hourHeight} />

          {/* Comparison Mode vs Single Mode */}
          {isComparisonMode && day.scenarios && day.scenarios.length > 0 ? (
            <Box
              sx={{
                display: "flex",
                width: "fit-content",
                position: "absolute",
                top: 0, // Should be 0 since it's overlaying the grid area
                left: 0,
                bottom: 0,
                zIndex: 10, // Ensure activities are above grid lines
              }}
            >
              {/* Render all scenarios including default/main */}
              {[
                { id: "main", name: t("mainPlan") || "Main Plan", activities: day.activities || [] },
                ...day.scenarios.map((s) => ({ id: s.id, name: s.name, activities: s.activities })),
              ].map((scenario) => {
                const scenarioLanes = calculateActivityLanes(scenario.activities)
                return (
                  <Box
                    key={scenario.id}
                    sx={{
                      width: dayColumnWidth,
                      minWidth: dayColumnWidth,
                      borderRight: "1px solid #eee",
                      position: "relative",
                      height: "100%",
                    }}
                  >
                    {/* Activities for this scenario */}
                    {scenario.activities.map((activity) => (
                      <TimelineActivityCard
                        key={activity.id}
                        activity={activity}
                        dayDate={day.date}
                        laneInfo={scenarioLanes.get(activity.id) || { lane: 0, totalLanes: 1 }}
                        hourHeight={hourHeight}
                        minActivityHeight={minActivityHeight}
                        isMobile={isMobile}
                        isDragging={activity.id === draggedActivityId}
                        isExpanded={activity.id === expandedActivityId}
                        isConflicting={conflictingActivityIds.has(activity.id)}
                        onDragStart={handleActivityDragStart}
                        onDragEnd={handleActivityDragEnd}
                        onExpand={setExpandedActivityId}
                        onClick={onActivityClick || (() => {})}
                        onContextMenu={(e) => handleContextMenu(e, day, activity.id)}
                        theme={theme}
                      />
                    ))}
                  </Box>
                )
              })}
            </Box>
          ) : (
            /* Normal Single View */
            <>
              {/* Activities */}
              {dayActivities.map((activity) => (
                <TimelineActivityCard
                  key={activity.id}
                  activity={activity}
                  dayDate={day.date}
                  laneInfo={lanes.get(activity.id) || { lane: 0, totalLanes: 1 }}
                  hourHeight={hourHeight}
                  minActivityHeight={minActivityHeight}
                  isMobile={isMobile}
                  isDragging={activity.id === draggedActivityId}
                  isExpanded={activity.id === expandedActivityId}
                  isConflicting={conflictingActivityIds.has(activity.id)}
                  onDragStart={handleActivityDragStart}
                  onDragEnd={handleActivityDragEnd}
                  onExpand={setExpandedActivityId}
                  onClick={onActivityClick || (() => {})}
                  onContextMenu={(e) => handleContextMenu(e, day, activity.id)}
                  theme={theme}
                />
              ))}

              {/* Transport Segments */}
              {(transport || []).map((trans) => {
                if (!trans.isSelected) return null
                const fromActivity = dayActivities.find((a) => a.id === trans.fromActivityId)
                if (!fromActivity) return null
                return (
                  <TimelineTransportSegment
                    key={trans.id}
                    transport={trans}
                    fromActivity={fromActivity}
                    dayDate={day.date}
                    hourHeight={hourHeight}
                    onTransportClick={onTransportClick}
                  />
                )
              })}
            </>
          )}

          {/* Drag Preview */}
          {dragPreview && dragPreview.dayId === day.id && (
            <Box
              sx={{
                position: "absolute",
                top: `${dragPreview.top}px`,
                left: 4,
                right: 4,
                height: `${(dragPreview.duration / 60) * hourHeight}px`,
                bgcolor: "primary.main",
                opacity: 0.4,
                borderRadius: 1,
                zIndex: 1000,
                pointerEvents: "none",
                border: "2px dashed",
                borderColor: "primary.dark",
              }}
            />
          )}
        </Box>
      </Box>
    </Box>
  )
}
