import { useDroppable } from "@dnd-kit/core"
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { ExpandMore, ExpandLess, Add as AddIcon } from "@mui/icons-material"
import { Box, Typography, Paper, Chip, IconButton, Collapse } from "@mui/material"
import dayjs from "dayjs"

import type { Activity, TripDay, Trip } from "../types"

import { SortableActivityCard } from "./SortableActivityCard"
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
}: DayItineraryCardProps) => {
  const activeScenario = day.scenarios?.find((s) => s.isSelected)
  const displayActivities = activeScenario ? activeScenario.activities || [] : day.activities || []

  const activitiesCost = displayActivities.reduce((sum, activity) => sum + (Number(activity.estimatedCost) || 0), 0)

  const transportCost = (trip.transport || [])
    .filter((t) => {
      if (!t.isSelected) return false
      // Find transport segments that belong to this day (between activities of this day)
      const fromActivity = displayActivities.find((a) => a.id === t.fromActivityId)
      return !!fromActivity
    })
    .reduce((sum, t) => sum + (Number(t.cost) || 0), 0)

  // console.log(`Day ${day.dayNumber} Cost Debug:`, { activitiesCost, transportCost, transportCount: trip.transport?.length })

  const dayCost = activitiesCost + transportCost

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
            {dayCost > 0 && (
              <Chip
                size="small"
                label={`$${dayCost.toFixed(0)} (A: $${activitiesCost} T: $${transportCost})`}
                title={`Activities: $${activitiesCost}, Transport: $${transportCost}`}
                color={costColor}
                variant="outlined"
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
              {displayActivities
                .slice()
                .sort((a, b) => {
                  if (!a.scheduledStart || !b.scheduledStart) return 0
                  return new Date(a.scheduledStart).getTime() - new Date(b.scheduledStart).getTime()
                })
                .map((activity, index, sortedActivities) => (
                  <Box key={activity.id}>
                    <SortableActivityCard
                      activity={activity}
                      canEdit={canEdit}
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
                        alternatives={
                          trip.transport?.filter(
                            (t) =>
                              t.fromActivityId === activity.id && t.toActivityId === sortedActivities[index + 1].id,
                          ) || []
                        }
                      />
                    )}
                  </Box>
                ))}
            </SortableContext>
          </DroppableDay>
        </Collapse>
      </Paper>
    </Box>
  )
}
