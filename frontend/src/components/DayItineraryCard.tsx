import { useDroppable } from "@dnd-kit/core"
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { ExpandMore, ExpandLess, Add as AddIcon } from "@mui/icons-material"
import { Box, Typography, Paper, Chip, IconButton, Collapse } from "@mui/material"
import dayjs from "dayjs"
import { useState } from "react"

import type { Activity, TripDay, Trip } from "../types"
import { calculateDayCost } from "../utils/costUtils"

import { SortableActivityCard } from "./SortableActivityCard"
import { CostBreakdownDialog } from "./Timeline/TimelineDialogs"
import { TransportSegment } from "./Transport/TransportSegment"
interface DayItineraryCardProps {
  day: TripDay
  trip: Trip
  isCollapsed: boolean
  canEdit: boolean
  onToggleCollapse: (dayId: string) => void
  onAddActivity: (dayId: string) => void
  onEditActivity: (activity: Activity) => void
  onDeleteActivity: (id: string) => void
  onCopyActivity: (activityId: string, asLink?: boolean) => void
  onFlyTo: (lat: number, lng: number) => void
  exchangeRates: Record<string, number>
  isPublic?: boolean
}

const DroppableDay = ({ dayId, children }: { dayId: string; children: React.ReactNode }) => {
  const { setNodeRef } = useDroppable({
    id: dayId,
  })

  return (
    <Box
      ref={setNodeRef}
      sx={{
        minHeight: 100,
        bgcolor: "#fafafa",
        p: 1,
        borderRadius: 1,
        flexGrow: 1,
      }}
    >
      {children}
    </Box>
  )
}

export const DayItineraryCard = ({
  day,
  trip,
  isCollapsed,
  canEdit,
  onToggleCollapse,
  onAddActivity,
  onEditActivity,
  onDeleteActivity,
  onCopyActivity,
  onFlyTo,
  exchangeRates,
  isPublic = false,
}: DayItineraryCardProps) => {
  const [showCostBreakdown, setShowCostBreakdown] = useState(false)
  const activeScenario = day.scenarios?.find((s) => s.isSelected)
  const displayActivities = activeScenario ? activeScenario.activities || [] : day.activities || []

  // Sort activities for consistent transport pairing
  const sortedActivities = [...displayActivities].sort((a, b) => {
    if (!a.scheduledStart || !b.scheduledStart) return 0
    return new Date(a.scheduledStart).getTime() - new Date(b.scheduledStart).getTime()
  })

  // Correctly identify transport segments that START from this day's sequence
  const dayTransport = (trip.transport || []).filter((t) => {
    return t.isSelected && sortedActivities.some((activity) => t.fromActivityId === activity.id)
  })

  const baseCurrency = trip.baseCurrency || trip.defaultCurrency || "USD"
  const costResult = calculateDayCost(displayActivities, dayTransport, exchangeRates || {}, baseCurrency)
  const dayCost = costResult.total

  const costColor = dayCost === 0 ? "default" : dayCost > 200 ? "error" : dayCost > 100 ? "warning" : "success"

  return (
    <Box sx={{ mb: 3 }}>
      <Paper sx={{ p: 2, bgcolor: activeScenario ? "#f8faff" : "background.paper" }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
          <Box display="flex" alignItems="center" gap={1}>
            <IconButton size="small" onClick={() => onToggleCollapse(day.id)}>
              {isCollapsed ? <ExpandMore /> : <ExpandLess />}
            </IconButton>
            <Typography variant="h6" color="primary">
              Day {day.dayNumber}: {day.name || dayjs(day.date).format("MMMM D, YYYY")}
              {activeScenario && (
                <Chip label={activeScenario.name} size="small" sx={{ ml: 1 }} color="secondary" variant="outlined" />
              )}
            </Typography>
          </Box>
          <Box display="flex" alignItems="center" gap={1}>
            {dayCost > 0 && !isPublic && (
              <Chip
                size="small"
                label={new Intl.NumberFormat("es-ES", {
                  style: "currency",
                  currency: baseCurrency,
                }).format(dayCost)}
                color={costColor}
                variant="outlined"
                onClick={() => setShowCostBreakdown(true)}
                sx={{ cursor: "pointer" }}
              />
            )}
            {canEdit && (
              <IconButton size="small" onClick={() => onAddActivity(day.id)}>
                <AddIcon />
              </IconButton>
            )}
          </Box>
        </Box>
        <Collapse in={!isCollapsed}>
          <DroppableDay dayId={day.id}>
            <SortableContext items={displayActivities.map((a) => a.id)} strategy={verticalListSortingStrategy}>
              {sortedActivities.map((activity, index) => (
                <Box key={activity.id}>
                  <SortableActivityCard
                    activity={activity}
                    canEdit={canEdit}
                    members={trip.members}
                    onEdit={() => onEditActivity(activity)}
                    onDelete={() => onDeleteActivity(activity.id)}
                    onCopy={(act, asLink) => onCopyActivity(act.id, asLink)}
                    onFlyTo={(act) => act.latitude && act.longitude && onFlyTo(act.latitude, act.longitude)}
                  />
                  {index < sortedActivities.length - 1 && (
                    <TransportSegment
                      tripId={trip.id}
                      fromActivityId={activity.id}
                      toActivityId={sortedActivities[index + 1].id}
                      fromActivity={activity}
                      toActivity={sortedActivities[index + 1]}
                      alternatives={
                        trip.transport?.filter(
                          (t) => t.fromActivityId === activity.id && t.toActivityId === sortedActivities[index + 1].id,
                        ) || []
                      }
                      currencies={trip.currencies}
                    />
                  )}
                </Box>
              ))}
            </SortableContext>
          </DroppableDay>
        </Collapse>
      </Paper>

      <CostBreakdownDialog
        open={showCostBreakdown}
        onClose={() => setShowCostBreakdown(false)}
        costResult={costResult}
        baseCurrency={baseCurrency}
      />
    </Box>
  )
}
