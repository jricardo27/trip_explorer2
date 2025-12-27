import { DndContext, closestCorners } from "@dnd-kit/core"
import type { DragEndEvent, SensorDescriptor, SensorOptions } from "@dnd-kit/core"
import { ExpandLess, Timeline as TimelineIcon } from "@mui/icons-material"
import { Grid, Box, Button, Typography } from "@mui/material"
import { useState } from "react"

import { useLanguageStore } from "../stores/languageStore"
import type { Trip, Activity } from "../types"

import { DayItineraryCard } from "./DayItineraryCard"
import { TransportSegment } from "./Transport/TransportSegment"
import { TripMap } from "./TripMap"

interface ItineraryViewProps {
  trip: Trip
  sensors: SensorDescriptor<SensorOptions>[]
  handleDragEnd: (event: DragEndEvent) => void
  collapsedDays: Set<string>
  toggleDayCollapse: (dayId: string) => void
  canEdit: boolean
  handleAddActivity: (dayId?: string, latLng?: { lat: number; lng: number }) => void
  handleEditActivity: (activity: Activity) => void
  handleDeleteActivity: (id: string) => void
  handleCopyActivity: (activityId: string, asLink?: boolean) => void
  setActiveFlyToLocation: (loc: { lat: number; lng: number; _ts: number } | null) => void
  activeFlyToLocation: { lat: number; lng: number; _ts?: number } | null
  mapExpanded: boolean
  setMapExpanded: (expanded: boolean) => void
  isMobile: boolean
  viewMode: string
  handleSaveAnimation: (data: any) => Promise<void>
  handleDeleteAnimation: (id: string) => Promise<void>
  exchangeRates: Record<string, number>
  isPublic?: boolean
}

export const ItineraryView = ({
  trip,
  sensors,
  handleDragEnd,
  collapsedDays,
  toggleDayCollapse,
  canEdit,
  handleAddActivity,
  handleEditActivity,
  handleDeleteActivity,
  handleCopyActivity,
  setActiveFlyToLocation,
  activeFlyToLocation,
  mapExpanded,
  setMapExpanded,
  isMobile,
  viewMode,
  handleSaveAnimation,
  handleDeleteAnimation,
  exchangeRates,
  isPublic = false,
}: ItineraryViewProps) => {
  const { t } = useLanguageStore()

  const [showRoutes, setShowRoutes] = useState(false)

  return (
    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
      <Grid container spacing={3}>
        {!mapExpanded && (
          <Grid size={{ xs: 12, md: 7 }}>
            {trip.days?.map((day, index) => {
              const nextDay = trip.days?.[index + 1]

              // Get last activity of current day
              const activeScenario = day.scenarios?.find((s) => s.isSelected)
              const currentActivities = (activeScenario ? activeScenario.activities || [] : day.activities || []).sort(
                (a, b) => {
                  if (!a.scheduledStart || !b.scheduledStart) return 0
                  return new Date(a.scheduledStart).getTime() - new Date(b.scheduledStart).getTime()
                },
              )
              const lastActivity = currentActivities[currentActivities.length - 1]

              // Get first activity of next day
              let firstNextActivity = null
              if (nextDay) {
                const nextActiveScenario = nextDay.scenarios?.find((s) => s.isSelected)
                const nextActivities = (
                  nextActiveScenario ? nextActiveScenario.activities || [] : nextDay.activities || []
                ).sort((a, b) => {
                  if (!a.scheduledStart || !b.scheduledStart) return 0
                  return new Date(a.scheduledStart).getTime() - new Date(b.scheduledStart).getTime()
                })
                firstNextActivity = nextActivities[0]
              }

              return (
                <Box key={day.id}>
                  <DayItineraryCard
                    day={day}
                    trip={trip}
                    isCollapsed={collapsedDays.has(day.id)}
                    canEdit={canEdit}
                    onToggleCollapse={toggleDayCollapse}
                    onAddActivity={handleAddActivity}
                    onEditActivity={handleEditActivity}
                    onDeleteActivity={handleDeleteActivity}
                    onCopyActivity={handleCopyActivity}
                    onFlyTo={(lat, lng) =>
                      setActiveFlyToLocation({
                        lat,
                        lng,
                        _ts: Date.now(),
                      })
                    }
                    exchangeRates={exchangeRates}
                    isPublic={isPublic}
                  />
                  {lastActivity && firstNextActivity && (
                    <Box sx={{ px: 2 }}>
                      <TransportSegment
                        tripId={trip.id}
                        fromActivityId={lastActivity.id}
                        toActivityId={firstNextActivity.id}
                        fromActivity={lastActivity}
                        toActivity={firstNextActivity}
                        alternatives={
                          trip.transport?.filter(
                            (t) => t.fromActivityId === lastActivity.id && t.toActivityId === firstNextActivity.id,
                          ) || []
                        }
                        currencies={trip.currencies}
                      />
                    </Box>
                  )}
                </Box>
              )
            })}
          </Grid>
        )}
        {!isMobile && (
          <Grid size={{ xs: 12, md: mapExpanded ? 12 : 5 }}>
            <Box sx={{ position: "sticky", top: 120, height: "calc(100vh - 160px)" }}>
              <Box display="flex" justifyContent="flex-end" alignItems="center" mb={1} gap={2}>
                <Box sx={{ display: "flex", alignItems: "center" }}>
                  <Typography variant="caption" color="text.secondary" sx={{ mr: 1 }}>
                    {t("showRoutes") || "Show routes"}
                  </Typography>
                  <input
                    type="checkbox"
                    checked={showRoutes}
                    onChange={(e) => setShowRoutes(e.target.checked)}
                    style={{ cursor: "pointer" }}
                  />
                </Box>
                <Button
                  size="small"
                  startIcon={mapExpanded ? <ExpandLess /> : <TimelineIcon />}
                  onClick={() => setMapExpanded(!mapExpanded)}
                >
                  {mapExpanded ? t("showActivities") : t("maximizeMap")}
                </Button>
              </Box>
              <TripMap
                activities={trip.activities}
                days={trip.days?.map((d) => ({
                  id: d.id,
                  name: d.name,
                  dayIndex: (d as any).dayNumber ? (d as any).dayNumber - 1 : 0,
                }))}
                activeFlyToLocation={activeFlyToLocation}
                onCreateActivity={(latLng) => {
                  handleAddActivity(undefined, latLng)
                }}
                viewMode={viewMode}
                title={trip.name}
                animations={trip.animations}
                onSaveAnimation={handleSaveAnimation}
                onDeleteAnimation={handleDeleteAnimation}
                transport={trip.transport}
                showRoutes={showRoutes}
              />
            </Box>
          </Grid>
        )}
      </Grid>
    </DndContext>
  )
}
