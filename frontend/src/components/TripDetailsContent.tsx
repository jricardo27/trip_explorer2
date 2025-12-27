import type { SensorDescriptor, SensorOptions, DragEndEvent } from "@dnd-kit/core"
import { Box, Grid, Paper, Typography, List, ListItem, ListItemText } from "@mui/material"
import { useState } from "react"

import type { Trip, Activity } from "../types"

import AnimationConfigDialog from "./AnimationConfigDialog"
import { CalendarView } from "./CalendarView"
import { ExpensesPanel } from "./ExpensesPanel"
import { ItineraryView } from "./ItineraryView"
import { JournalPanel } from "./JournalPanel"
import { PreparationTab } from "./PreparationTab"
import { TimelineCalendarView } from "./TimelineCalendarView"
import { TripAnimationList } from "./TripAnimationList"
import { TripMap } from "./TripMap"

interface TripDetailsContentProps {
  viewMode: string
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
  handleSaveAnimation: (data: any) => Promise<void>
  handleDeleteAnimation: (id: string) => Promise<void>
  handleDayOperation: (type: "move_all" | "swap" | "rename", dayId: string, payload: any) => Promise<void>
  updateActivity: (params: { id: string; data: any }) => Promise<any>
  selectScenario: (params: { scenarioId: string | null; tripDayId: string }) => Promise<any>
  createScenario: (params: { tripDayId: string; name: string }) => Promise<any>
  updateScenario: (params: { tripDayId: string; scenarioId: string; data: { name: string } }) => Promise<any>
  onTransportClick?: (transport: any) => void
}

export const TripDetailsContent = ({
  viewMode,
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
  handleSaveAnimation,
  handleDeleteAnimation,
  handleDayOperation,
  updateActivity,
  selectScenario,
  createScenario,
  updateScenario,
  onTransportClick,
}: TripDetailsContentProps) => {
  const [animationDialogOpen, setAnimationDialogOpen] = useState(false)
  const [selectedAnimation, setSelectedAnimation] = useState<any>(null)
  const [selectedAnimationId, setSelectedAnimationId] = useState<string | undefined>(
    trip.animations && trip.animations.length > 0 ? trip.animations[0].id : undefined,
  )

  const handleCreateAnimation = () => {
    setSelectedAnimation(null)
    setAnimationDialogOpen(true)
  }

  const handleEditAnimation = (animation: any) => {
    setSelectedAnimation(animation)
    setAnimationDialogOpen(true)
  }

  const handleAnimationSubmit = async (data: any) => {
    await handleSaveAnimation(data)
    setAnimationDialogOpen(false)
    setSelectedAnimation(null)
  }

  return (
    <Box sx={{ maxWidth: 1600, mx: "auto", px: { xs: 1, md: 2 } }}>
      {viewMode === "list" && (
        <ItineraryView
          trip={trip}
          sensors={sensors}
          handleDragEnd={handleDragEnd}
          collapsedDays={collapsedDays}
          toggleDayCollapse={toggleDayCollapse}
          canEdit={canEdit}
          handleAddActivity={handleAddActivity}
          handleEditActivity={handleEditActivity}
          handleDeleteActivity={handleDeleteActivity}
          handleCopyActivity={handleCopyActivity}
          setActiveFlyToLocation={setActiveFlyToLocation}
          activeFlyToLocation={activeFlyToLocation}
          mapExpanded={mapExpanded}
          setMapExpanded={setMapExpanded}
          isMobile={isMobile}
          viewMode={viewMode}
          handleSaveAnimation={handleSaveAnimation}
          handleDeleteAnimation={handleDeleteAnimation}
          exchangeRates={trip.exchangeRates || {}}
        />
      )}

      {viewMode === "prep" && <PreparationTab trip={trip} />}

      {viewMode === "expenses" && (
        <Box mt={3} sx={{ minHeight: 600 }}>
          <ExpensesPanel
            tripId={trip.id}
            trip={trip}
            defaultCurrency={trip.defaultCurrency}
            currencies={trip.currencies}
            onEditActivity={handleEditActivity}
          />
        </Box>
      )}

      {viewMode === "timeline" && trip.days && (
        <TimelineCalendarView
          days={trip.days}
          transport={trip.transport}
          onActivityClick={handleEditActivity}
          onTransportClick={onTransportClick}
          onActivityUpdate={(id, data) => updateActivity({ id, data })}
          onActivityCopy={handleCopyActivity}
          onDayOperation={handleDayOperation}
          onScenarioChange={async (dayId: string, scenarioId: string | null) => {
            await selectScenario({ scenarioId, tripDayId: dayId })
          }}
          onCreateScenario={async (dayId, name) => {
            await createScenario({ tripDayId: dayId, name })
          }}
          onRenameScenario={async (dayId, scenarioId, newName) => {
            await updateScenario({ tripDayId: dayId, scenarioId, data: { name: newName } })
          }}
          exchangeRates={trip.exchangeRates}
          baseCurrency={trip.baseCurrency || trip.defaultCurrency}
          members={trip.members}
        />
      )}

      {viewMode === "calendar" && trip.days && <CalendarView days={trip.days} />}

      {viewMode === "map" && (
        <Box sx={{ height: "calc(100vh - 200px)", mt: 2 }}>
          <TripMap
            activities={trip.activities}
            days={trip.days?.map((d) => ({
              id: d.id,
              name: d.name,
              dayIndex: (d as any).dayNumber ? (d as any).dayNumber - 1 : 0,
            }))}
            viewMode="map"
            title={trip.name}
            canEdit={canEdit}
            transport={trip.transport}
            activeFlyToLocation={activeFlyToLocation}
            onActivityClick={handleEditActivity}
            onCreateActivity={(latLng) => handleAddActivity(undefined, latLng)}
          />
        </Box>
      )}

      {viewMode === "journal" && (
        <Box mt={3}>
          <JournalPanel tripId={trip.id} days={trip.days || []} />
        </Box>
      )}

      {viewMode === "animation" && (
        <Grid container spacing={2} sx={{ mt: 2 }}>
          <Grid size={{ xs: 12, md: 4 }}>
            <Box sx={{ position: "sticky", top: 120 }}>
              <TripAnimationList
                animations={trip.animations || []}
                selectedAnimationId={selectedAnimationId}
                onSelect={setSelectedAnimationId}
                onEdit={handleEditAnimation}
                onDelete={handleDeleteAnimation}
                onCreate={handleCreateAnimation}
              />

              {/* Display activities in selected animation */}
              {selectedAnimationId &&
                trip.animations &&
                (() => {
                  const currentAnim = trip.animations.find((a) => a.id === selectedAnimationId)
                  return currentAnim && currentAnim.steps && currentAnim.steps.length > 0 ? (
                    <Paper sx={{ mt: 2, p: 2 }}>
                      <Typography variant="h6" gutterBottom>
                        Animation Steps
                      </Typography>
                      <List dense>
                        {currentAnim.steps
                          .sort((a, b) => a.orderIndex - b.orderIndex)
                          .map((step, index) => {
                            const activity = trip.activities?.find((a) => a.id === step.activityId)
                            return (
                              <ListItem key={step.id}>
                                <ListItemText
                                  primary={`${index + 1}. ${step.customLabel || activity?.name || "Unknown Activity"} `}
                                  secondary={activity?.address || ""}
                                />
                              </ListItem>
                            )
                          })}
                      </List>
                    </Paper>
                  ) : null
                })()}
            </Box>
          </Grid>
          <Grid size={{ xs: 12, md: 8 }}>
            <Box sx={{ height: "calc(100vh - 315px)" }}>
              <TripMap
                activities={trip.activities}
                days={trip.days?.map((d) => ({
                  id: d.id,
                  name: d.name,
                  dayIndex: (d as any).dayNumber ? (d as any).dayNumber - 1 : 0,
                }))}
                viewMode="animation"
                title={trip.name}
                animations={trip.animations}
                selectedAnimationId={selectedAnimationId}
                onSelectAnimation={setSelectedAnimationId}
                onSaveAnimation={handleSaveAnimation}
                onDeleteAnimation={handleDeleteAnimation}
                canEdit={canEdit}
                transport={trip.transport}
              />
            </Box>
          </Grid>
        </Grid>
      )}

      {/* Animation Config Dialog */}
      {viewMode === "animation" && (
        <AnimationConfigDialog
          open={animationDialogOpen}
          onClose={() => setAnimationDialogOpen(false)}
          trip={trip}
          initialData={selectedAnimation}
          onSubmit={handleAnimationSubmit}
        />
      )}
    </Box>
  )
}
