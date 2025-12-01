import {
  Drawer,
  Box,
  Typography,
  IconButton,
  Tabs,
  Tab,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  CircularProgress,
  Tooltip,
  useTheme,
  useMediaQuery,
} from "@mui/material"
import React, { useState, useContext, useCallback } from "react"
import { MdPushPin, MdClose } from "react-icons/md"

import SavedFeaturesContext from "../../contexts/SavedFeaturesContext"
import { useTripContext, DayLocation, TripFeature, Trip } from "../../contexts/TripContext"
import { showSuccess, showError } from "../../utils/notifications"
import { AuthModal } from "../Auth/AuthModal"
import { AddFeatureModal } from "../Trips/AddFeatureModal"
import { AddLocationModal } from "../Trips/AddLocationModal"
import { CreateTripModal } from "../Trips/CreateTripModal"
import { EditItemModal } from "../Trips/EditItemModal"

import { CategoryContextMenu } from "./ContextMenu/CategoryContextMenu"
import { FeatureContextMenu } from "./ContextMenu/FeatureContextMenu"
import { FeatureDetailsModal } from "./FeatureDetailsModal"
import { FeatureDragContext } from "./FeatureList/FeatureDragContext"
import { FeatureListView } from "./FeatureViews/FeatureListView"
import { useCategoryManagement } from "./hooks/useCategoryManagement"
import { useContextMenu } from "./hooks/useContextMenu"
import { useFeatureManagement } from "./hooks/useFeatureManagement"
import { useFeatureSelection } from "./hooks/useFeatureSelection"
import { TripDetailView } from "./TripViews/TripDetailView"
import { TripListView } from "./TripViews/TripListView"
import { UserAuthSection } from "./UserAuthSection"

interface SavedFeaturesDrawerProps {
  drawerOpen: boolean
  onClose: () => void
  isPinned: boolean
  onTogglePin: () => void
  onFlyTo: (lat: number, lng: number) => void
}

interface DeleteLocationData {
  id: string
  dayId: string
}
interface DeleteFeatureData {
  item: TripFeature
  dayId: string
}

const SavedFeaturesDrawer: React.FC<SavedFeaturesDrawerProps> = ({
  drawerOpen,
  onClose,
  isPinned,
  onTogglePin,
  onFlyTo,
}) => {
  const { savedFeatures, userId, setUserId, email, logout, setSavedFeatures, removeFeature } =
    useContext(SavedFeaturesContext)!

  const {
    trips,
    currentTrip,
    dayFeatures,
    dayLocations,
    fetchTripDetails,
    addLocationToDay,
    deleteLocation,
    addFeatureToDay,
    deleteFeature,
    createTrip,
    deleteTrip,
    setCurrentTrip,
    reorderItems,
  } = useTripContext()

  const [tripFilter, setTripFilter] = useState<"all" | "future" | "past" | "current">("all")
  const [isPlanningMode, setIsPlanningMode] = useState(false)

  const { contextMenu, contextMenuTab, contextMenuFeature, handleContextMenu, handleTabContextMenu, handleClose } =
    useContextMenu()

  const [viewMode, setViewMode] = useState("lists")
  const [selectedTab, setSelectedTab] = useState<string>("all")
  const { selectedFeature, setSelectedFeature } = useFeatureSelection(savedFeatures, selectedTab)

  const handleTabChange = useCallback(
    (_event: React.SyntheticEvent, newValue: string) => {
      setSelectedTab(newValue)
      setSelectedFeature(null)
    },
    [setSelectedFeature],
  )

  const { moveCategory, handleRenameCategory, handleAddCategory, handleRemoveCategory } = useCategoryManagement(
    setSavedFeatures,
    setSelectedTab,
    savedFeatures,
    contextMenuTab,
  )

  const { handleDuplicate, handleRemoveFromList, handleRemoveCompletely } = useFeatureManagement(
    setSavedFeatures,
    selectedTab,
    contextMenuFeature,
    removeFeature,
  )

  // State for modals and interactions
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)
  const [isCreateTripModalOpen, setIsCreateTripModalOpen] = useState(false)
  const [selectedDayForLocation, setSelectedDayForLocation] = useState<{ id: string; date: string } | null>(null)
  const [selectedDayForFeature, setSelectedDayForFeature] = useState<{ id: string; date: string } | null>(null)
  const [editingItem, setEditingItem] = useState<{
    item: DayLocation | TripFeature
    type: "location" | "feature"
  } | null>(null)
  const [viewingFeature, setViewingFeature] = useState<TripFeature | null>(null)
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    type: "trip" | "location" | "feature" | "logout" | null
    data: { id: string } | DeleteLocationData | DeleteFeatureData | null
  }>({ type: null, data: null })
  const [isLoading, setIsLoading] = useState(false)

  const handleCreateTrip = async (tripData: Omit<Trip, "id" | "created_at" | "updated_at" | "user_id">) => {
    setIsLoading(true)
    try {
      await createTrip(tripData.name, tripData.start_date, tripData.end_date)
      setIsCreateTripModalOpen(false)
      showSuccess("Trip created successfully")
    } catch (error) {
      console.error("Error creating trip:", error)
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred"
      showError(`Failed to create trip: ${errorMessage}`)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteTrip = (tripId: string) => {
    setDeleteConfirmation({
      type: "trip",
      data: { id: tripId },
    })
  }

  const confirmDeleteTrip = async () => {
    if (deleteConfirmation.type === "trip" && deleteConfirmation.data) {
      setIsLoading(true)
      try {
        await deleteTrip((deleteConfirmation.data as { id: string }).id)
        setDeleteConfirmation({ type: null, data: null })
        if (currentTrip && currentTrip.id === (deleteConfirmation.data as { id: string }).id) {
          setCurrentTrip(null)
        }
        showSuccess("Trip deleted successfully")
      } catch (error) {
        console.error("Error deleting trip:", error)
        const errorMessage = error instanceof Error ? error.message : "Unknown error occurred"
        showError(`Failed to delete trip: ${errorMessage}`)
      } finally {
        setIsLoading(false)
      }
    }
  }

  const handleAddFeature = async (feature: unknown) => {
    if (selectedDayForFeature) {
      setIsLoading(true)
      try {
        await addFeatureToDay(selectedDayForFeature.id, feature, !isPlanningMode, isPlanningMode)
        showSuccess("Feature added to trip day!")
      } catch (error) {
        console.error("Failed to add feature:", error)
        const errorMessage = error instanceof Error ? error.message : "Unknown error occurred"
        showError(`Failed to add feature to trip day: ${errorMessage}`)
      } finally {
        setIsLoading(false)
        setSelectedDayForFeature(null)
      }
    }
  }

  const handleAddLocation = async (location: Omit<DayLocation, "id" | "trip_day_id" | "created_at">) => {
    if (selectedDayForLocation) {
      setIsLoading(true)
      try {
        await addLocationToDay(selectedDayForLocation.id, location)
        showSuccess("Location added to trip day!")
      } catch (error) {
        console.error("Failed to add location:", error)
        const errorMessage = error instanceof Error ? error.message : "Unknown error occurred"
        showError(`Failed to add location to trip day: ${errorMessage}`)
      } finally {
        setIsLoading(false)
        setSelectedDayForLocation(null)
      }
    }
  }

  const handleMoveItem = async (
    dayId: string,
    index: number,
    direction: "up" | "down",
    items: (DayLocation | TripFeature)[],
  ) => {
    if (!items || items.length === 0) return

    const newIndex = direction === "up" ? index - 1 : index + 1
    if (newIndex < 0 || newIndex >= items.length) return

    setIsLoading(true)

    // Create a new array with the moved item
    const newItems = [...items]
    const [movedItem] = newItems.splice(index, 1)
    newItems.splice(newIndex, 0, movedItem)

    // Prepare the payload for reorderItems
    const reorderPayload = newItems.map((item, idx) => {
      const isFeature = "type" in item && item.type === "Feature"
      return {
        id: isFeature
          ? (item as TripFeature).saved_id || (item as TripFeature).properties.id
          : (item as DayLocation).id,
        type: isFeature ? "feature" : ("location" as "feature" | "location"),
        order: idx,
      }
    })

    try {
      await reorderItems(dayId, reorderPayload)
    } catch (error) {
      console.error("Error moving item:", error)
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred"
      showError(`Failed to reorder item: ${errorMessage}`)
    } finally {
      setIsLoading(false)
    }
  }

  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"))

  return (
    <Drawer
      anchor="left"
      open={drawerOpen}
      onClose={isPinned ? undefined : onClose}
      variant={isPinned ? "persistent" : "temporary"}
      PaperProps={{
        sx: {
          width: isPinned || !isMobile ? 400 : "100%",
          maxWidth: isPinned || !isMobile ? 400 : "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          pointerEvents: "auto",
        },
      }}
      ModalProps={{
        keepMounted: true,
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", p: 2, borderBottom: 1, borderColor: "divider" }}>
        <Typography variant="h6" sx={{ flexGrow: 1 }}>
          Saved Features
        </Typography>
        <Box>
          <Tooltip title={isPinned ? "Unpin" : "Pin"}>
            <IconButton onClick={onTogglePin}>
              <MdPushPin style={{ transform: isPinned ? "rotate(45deg)" : "none" }} />
            </IconButton>
          </Tooltip>
          {!isPinned && (
            <Tooltip title="Close">
              <IconButton onClick={onClose}>
                <MdClose />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      </Box>

      <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
        <Tabs value={viewMode} onChange={(_e, val) => setViewMode(val)} variant="fullWidth">
          <Tab label="Lists" value="lists" />
          <Tab label="Trips" value="trips" />
        </Tabs>
      </Box>

      <Box sx={{ flexGrow: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
        {isLoading ? (
          <Box sx={{ display: "flex", justifyContent: "center", p: 2 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            {viewMode === "lists" ? (
              <FeatureDragContext
                savedFeatures={savedFeatures}
                selectedTab={selectedTab}
                setSavedFeatures={setSavedFeatures}
              >
                <FeatureListView
                  savedFeatures={savedFeatures}
                  setSavedFeatures={setSavedFeatures}
                  selectedTab={selectedTab}
                  handleTabChange={handleTabChange}
                  handleTabContextMenu={handleTabContextMenu}
                  handleContextMenu={handleContextMenu}
                  selectedFeature={selectedFeature}
                  setSelectedFeature={setSelectedFeature}
                />
              </FeatureDragContext>
            ) : currentTrip ? (
              <TripDetailView
                trip={currentTrip}
                dayLocations={dayLocations}
                dayFeatures={dayFeatures}
                onBack={() => setCurrentTrip(null)}
                isPlanningMode={isPlanningMode}
                onTogglePlanningMode={() => setIsPlanningMode((prev) => !prev)}
                onAddLocation={(id, date) => setSelectedDayForLocation({ id, date })}
                onAddFeature={(id, date) => setSelectedDayForFeature({ id, date })}
                onEditItem={(item, type) => setEditingItem({ item, type: type === "Feature" ? "feature" : "location" })}
                onDeleteItem={(item, dayId) => {
                  if ("type" in item && item.type === "Feature") {
                    setDeleteConfirmation({
                      type: "feature",
                      data: { item: item as TripFeature, dayId },
                    })
                  } else {
                    setDeleteConfirmation({
                      type: "location",
                      data: { id: (item as DayLocation).id, dayId },
                    })
                  }
                }}
                onMoveItem={handleMoveItem}
                onFlyTo={onFlyTo}
                onViewFeature={setViewingFeature}
              />
            ) : (
              <TripListView
                trips={trips}
                tripFilter={tripFilter}
                onTripFilterChange={setTripFilter}
                onTripSelect={fetchTripDetails}
                onTripDelete={handleDeleteTrip}
                onCreateTrip={() => setIsCreateTripModalOpen(true)}
              />
            )}
          </>
        )}
      </Box>

      <UserAuthSection
        email={email}
        userId={userId}
        setUserId={setUserId}
        logout={() => setDeleteConfirmation({ type: "logout", data: null })}
        onLoginClick={() => setIsAuthModalOpen(true)}
      />

      <AuthModal open={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />

      <CreateTripModal
        open={isCreateTripModalOpen}
        onClose={() => setIsCreateTripModalOpen(false)}
        onCreateTrip={handleCreateTrip}
      />

      <AddLocationModal
        open={!!selectedDayForLocation}
        onClose={() => setSelectedDayForLocation(null)}
        onAddLocation={handleAddLocation}
        dayDate={selectedDayForLocation?.date || ""}
        isPlanningMode={isPlanningMode}
      />

      <AddFeatureModal
        open={!!selectedDayForFeature}
        onClose={() => setSelectedDayForFeature(null)}
        onAddFeature={handleAddFeature}
        dayDate={selectedDayForFeature?.date || ""}
      />

      <EditItemModal
        open={!!editingItem}
        onClose={() => setEditingItem(null)}
        item={editingItem?.item || null}
        type={editingItem?.type || "location"}
        onSave={(updatedItem) => {
          // Implement save logic here or pass a handler
          console.log("Save item:", updatedItem)
          setEditingItem(null)
        }}
      />

      <FeatureDetailsModal feature={viewingFeature} onClose={() => setViewingFeature(null)} open={!!viewingFeature} />

      <CategoryContextMenu
        contextMenu={contextMenu}
        contextMenuTab={contextMenuTab}
        handleClose={handleClose}
        moveCategory={moveCategory}
        handleRenameCategory={handleRenameCategory}
        handleAddCategory={handleAddCategory}
        handleRemoveCategory={handleRemoveCategory}
      />

      <FeatureContextMenu
        contextMenu={contextMenu}
        contextMenuFeature={contextMenuFeature}
        handleClose={handleClose}
        handleDuplicate={handleDuplicate}
        handleRemoveFromList={handleRemoveFromList}
        handleRemoveCompletely={handleRemoveCompletely}
      />

      <Dialog open={!!deleteConfirmation.type} onClose={() => setDeleteConfirmation({ type: null, data: null })}>
        <DialogTitle>
          {deleteConfirmation.type === "trip"
            ? "Delete Trip"
            : deleteConfirmation.type === "location"
              ? "Delete Location"
              : deleteConfirmation.type === "feature"
                ? "Delete Feature"
                : "Logout"}
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            {deleteConfirmation.type === "trip"
              ? "Are you sure you want to delete this trip? This action cannot be undone."
              : deleteConfirmation.type === "location"
                ? "Are you sure you want to delete this location from the day?"
                : deleteConfirmation.type === "feature"
                  ? "Are you sure you want to delete this feature from the day?"
                  : "Are you sure you want to logout? Your unsaved local data might be lost."}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmation({ type: null, data: null })}>Cancel</Button>
          <Button
            onClick={() => {
              if (deleteConfirmation.type === "trip") {
                confirmDeleteTrip()
              } else if (deleteConfirmation.type === "location") {
                const { id, dayId } = deleteConfirmation.data as DeleteLocationData
                setIsLoading(true)
                deleteLocation(id, dayId)
                  .then(() => {
                    setDeleteConfirmation({ type: null, data: null })
                    showSuccess("Location deleted successfully")
                  })
                  .catch((error) => {
                    console.error("Error deleting location:", error)
                    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred"
                    showError(`Failed to delete location: ${errorMessage}`)
                  })
                  .finally(() => setIsLoading(false))
              } else if (deleteConfirmation.type === "feature") {
                const { item, dayId } = deleteConfirmation.data as DeleteFeatureData
                setIsLoading(true)
                deleteFeature(item.saved_id || item.properties.id, dayId)
                  .then(() => {
                    setDeleteConfirmation({ type: null, data: null })
                    showSuccess("Feature deleted successfully")
                  })
                  .catch((error) => {
                    console.error("Error deleting feature:", error)
                    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred"
                    showError(`Failed to delete feature: ${errorMessage}`)
                  })
                  .finally(() => setIsLoading(false))
              } else if (deleteConfirmation.type === "logout") {
                logout()
                setDeleteConfirmation({ type: null, data: null })
              }
            }}
            color="error"
            autoFocus
          >
            Confirm
          </Button>
        </DialogActions>
      </Dialog>
    </Drawer>
  )
}

export default SavedFeaturesDrawer
