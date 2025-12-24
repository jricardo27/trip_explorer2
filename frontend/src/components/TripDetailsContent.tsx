import type { SensorDescriptor, SensorOptions, DragEndEvent } from "@dnd-kit/core"
import { Box } from "@mui/material"

import type { Trip, Activity } from "../types"

import { ExpensesPanel } from "./ExpensesPanel"
import { ItineraryView } from "./ItineraryView"
import { JournalPanel } from "./JournalPanel"
import { PreparationTab } from "./PreparationTab"
import { TimelineCalendarView } from "./TimelineCalendarView"

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
  selectScenario: (scenarioId: string) => Promise<any>
  createScenario: (params: { tripDayId: string; name: string }) => Promise<any>
  updateScenario: (params: { tripDayId: string; scenarioId: string; data: { name: string } }) => Promise<any>
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
}: TripDetailsContentProps) => {
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
          onTransportClick={(transport) => console.log("Transport clicked", transport)}
          onActivityUpdate={(id, data) => updateActivity({ id, data })}
          onActivityCopy={handleCopyActivity}
          onDayOperation={handleDayOperation}
          onScenarioChange={async (_dayId, scenarioId) => {
            if (scenarioId) {
              await selectScenario(scenarioId)
            }
          }}
          onCreateScenario={async (dayId, name) => {
            await createScenario({ tripDayId: dayId, name })
          }}
          onRenameScenario={async (dayId, scenarioId, newName) => {
            await updateScenario({ tripDayId: dayId, scenarioId, data: { name: newName } })
          }}
        />
      )}

      {viewMode === "journal" && (
        <Box mt={3}>
          <JournalPanel tripId={trip.id} days={trip.days || []} />
        </Box>
      )}
    </Box>
  )
}
