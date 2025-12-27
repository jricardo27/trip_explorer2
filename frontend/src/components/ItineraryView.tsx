import { DndContext, closestCorners } from "@dnd-kit/core"
import type { DragEndEvent, SensorDescriptor, SensorOptions } from "@dnd-kit/core"
import { ExpandLess, Timeline as TimelineIcon } from "@mui/icons-material"
import { Grid, Box, Button } from "@mui/material"

import { useLanguageStore } from "../stores/languageStore"
import type { Trip, Activity } from "../types"

import { DayItineraryCard } from "./DayItineraryCard"
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

  return (
    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
      <Grid container spacing={3}>
        {!mapExpanded && (
          <Grid size={{ xs: 12, md: 7 }}>
            {trip.days?.map((day) => (
              <DayItineraryCard
                key={day.id}
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
            ))}
          </Grid>
        )}
        {!isMobile && (
          <Grid size={{ xs: 12, md: mapExpanded ? 12 : 5 }}>
            <Box sx={{ position: "sticky", top: 120, height: "calc(100vh - 160px)" }}>
              <Box display="flex" justifyContent="flex-end" mb={1}>
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
              />
            </Box>
          </Grid>
        )}
      </Grid>
    </DndContext>
  )
}
