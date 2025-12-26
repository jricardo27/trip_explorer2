import { MoreVert } from "@mui/icons-material"
import { Box, IconButton, Typography } from "@mui/material"

import { useLanguageStore } from "../../stores/languageStore"
import type { Activity, TripDay, TransportAlternative } from "../../types"

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
}: TimelineDayColumnProps) => {
  const { t } = useLanguageStore()
  const activeScenario = day.scenarios?.find((s) => s.isSelected)
  const dayActivities = activeScenario ? activeScenario.activities : day.activities || []

  const lanes = calculateActivityLanes(dayActivities)

  // Calculate Cost
  const activityCost = dayActivities.reduce((sum, a) => {
    const hasActual = a.actualCost !== null && a.actualCost !== undefined
    const cost = hasActual ? Number(a.actualCost) : Number(a.estimatedCost) || 0
    return sum + cost
  }, 0)

  const transportCost = (transport || [])
    .filter((t) => {
      if (!t.isSelected) return false
      const fromActivity = dayActivities.find((a) => a.id === t.fromActivityId)
      return !!fromActivity
    })
    .reduce((sum, t) => sum + (Number(t.cost) || 0), 0)

  const totalCost = activityCost + transportCost

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
        totalCost={totalCost}
        dayHeaderHeight={dayHeaderHeight}
        isComparisonMode={isComparisonMode}
        onToggleComparison={onToggleComparison}
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
