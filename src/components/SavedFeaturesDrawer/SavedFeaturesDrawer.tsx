import {
  Drawer,
  Box,
  TextField,
  useTheme,
  useMediaQuery,
  Typography,
  Button,
  Tabs,
  Tab,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Chip,
  Stack,
  Collapse,
  CircularProgress,
} from "@mui/material"
import React, { useState, useContext, useCallback, useEffect, useMemo } from "react"
import { FaFilter } from "react-icons/fa"
import { MdContentCopy, MdPushPin } from "react-icons/md"

import SavedFeaturesContext, { DEFAULT_CATEGORY } from "../../contexts/SavedFeaturesContext"
import { useTripContext, DayLocation, TripFeature, Trip } from "../../contexts/TripContext"
import { showSuccess, showError } from "../../utils/notifications"
import { AuthModal } from "../Auth/AuthModal"
import { AddFeatureModal } from "../Trips/AddFeatureModal"
import { AddLocationModal } from "../Trips/AddLocationModal"
import { CreateTripModal } from "../Trips/CreateTripModal"
import { EditItemModal } from "../Trips/EditItemModal"

import { filterFeaturesByType, extractFeatureTypes, FeatureFilters } from "./advancedFilterFeatures"
import { CategoryContextMenu } from "./ContextMenu/CategoryContextMenu"
import { FeatureContextMenu } from "./ContextMenu/FeatureContextMenu"
import { FeatureDetailsModal } from "./FeatureDetailsModal"
import { FeatureDragContext } from "./FeatureList/FeatureDragContext"
import { FeatureList } from "./FeatureList/FeatureList"
import { filterFeatures } from "./filterFeatures"
import { useCategoryManagement } from "./hooks/useCategoryManagement"
import { useContextMenu } from "./hooks/useContextMenu"
import { useFeatureManagement } from "./hooks/useFeatureManagement"
import { useFeatureSelection } from "./hooks/useFeatureSelection"
import { TabList } from "./TabList/TabList"
import { TripDetailView } from "./TripViews/TripDetailView"
import { TripListView } from "./TripViews/TripListView"

interface SavedFeaturesDrawerProps {
  drawerOpen: boolean
  onClose: () => void
  setCurrentCategory?: (newState: string) => void
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
interface DeleteTripData {
  id: string
}

const excludedProperties = ["id", "images", "style"] as const

const SavedFeaturesDrawer: React.FC<SavedFeaturesDrawerProps> = ({
  drawerOpen,
  onClose,
  setCurrentCategory,
  isPinned,
  onTogglePin,
  onFlyTo,
}) => {
  const [selectedTab, setSelectedTab] = useState<string>(DEFAULT_CATEGORY)
  const [searchQuery, setSearchQuery] = useState<string>("")
  const [advancedFilters, setAdvancedFilters] = useState<FeatureFilters>({
    searchQuery: "",
    types: [],
    tags: [],
  })
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
  const [inputUserId, setInputUserId] = useState<string>("")
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)
  const [viewMode, setViewMode] = useState<"lists" | "trips">("lists")
  const [tripFilter, setTripFilter] = useState<"all" | "current" | "past" | "future">("all")
  const [isLoading, setIsLoading] = useState(false)
  const [isCreateTripModalOpen, setIsCreateTripModalOpen] = useState(false)
  const [selectedDayForFeature, setSelectedDayForFeature] = useState<{ id: string; date: string } | null>(null)
  const [selectedDayForLocation, setSelectedDayForLocation] = useState<{ id: string; date: string } | null>(null)
  const [editingItem, setEditingItem] = useState<{
    item: DayLocation | TripFeature
    type: "location" | "Feature"
  } | null>(null)
  const [viewingFeature, setViewingFeature] = useState<TripFeature | null>(null)
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    type: "trip" | "location" | "feature" | "logout" | null
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: any
  }>({ type: null, data: null })

  const {
    trips,
    currentTrip,
    dayFeatures,
    dayLocations,
    fetchTripDetails,
    deleteTrip,
    setCurrentTrip,
    addFeatureToDay,
    addLocationToDay,
    createTrip, // Added createTrip
    deleteLocation,
    deleteFeature,
    reorderItems,
  } = useTripContext()

  const { savedFeatures, setSavedFeatures, removeFeature, userId, setUserId, email, logout } =
    useContext(SavedFeaturesContext)!
  const { selectedFeature, setSelectedFeature } = useFeatureSelection()
  const { contextMenu, contextMenuTab, contextMenuFeature, handleContextMenu, handleTabContextMenu, handleClose } =
    useContextMenu()
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

  const theme = useTheme()
  const isXs = useMediaQuery(theme.breakpoints.down("sm"))
  const isSm = useMediaQuery(theme.breakpoints.between("sm", "md"))
  const isMd = useMediaQuery(theme.breakpoints.between("md", "lg"))

  const drawerWidth = isMd ? "70%" : isSm ? "50%" : isXs ? "92%" : "50%"

  const handleTabChange = useCallback(
    (_event: React.SyntheticEvent, newValue: string) => {
      setSelectedTab(newValue)
      setSelectedFeature(null)
    },
    [setSelectedFeature],
  )

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value
    setSearchQuery(value)
    setAdvancedFilters((prev) => ({ ...prev, searchQuery: value }))
  }

  const handleTypeToggle = (type: string) => {
    setAdvancedFilters((prev) => ({
      ...prev,
      types: prev.types.includes(type) ? prev.types.filter((t) => t !== type) : [...prev.types, type],
    }))
  }

  useEffect(() => {
    if (setCurrentCategory) {
      setCurrentCategory(selectedTab)
    }
  }, [selectedTab, setCurrentCategory])

  const itemsWithOriginalIndex = useMemo(() => {
    return (savedFeatures[selectedTab] || []).map((feature, index) => ({
      feature,
      originalIndex: index,
    }))
  }, [savedFeatures, selectedTab])

  const filteredItems = useMemo(() => {
    const basicFiltered = filterFeatures(itemsWithOriginalIndex, searchQuery)
    if (showAdvancedFilters) {
      return filterFeaturesByType(basicFiltered, advancedFilters)
    }
    return basicFiltered
  }, [itemsWithOriginalIndex, searchQuery, showAdvancedFilters, advancedFilters])

  const availableTypes = useMemo(() => extractFeatureTypes(savedFeatures), [savedFeatures])

  const handleCreateTrip = async (tripData: Omit<Trip, "id" | "created_at" | "updated_at" | "user_id">) => {
    setIsLoading(true)
    try {
      await createTrip(tripData.name, tripData.start_date, tripData.end_date)
      setIsCreateTripModalOpen(false)
      showSuccess("Trip created successfully!")
    } catch (error) {
      console.error("Error creating trip:", error)
      showError("Failed to create trip. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteTrip = async (tripId: string) => {
    setIsLoading(true)
    try {
      await deleteTrip(tripId)
      setDeleteConfirmation({ type: null, data: null })
      if (currentTrip && currentTrip.id === tripId) {
        setCurrentTrip(null)
      }
      showSuccess("Trip deleted successfully")
    } catch (error) {
      console.error("Error deleting trip:", error)
      showError("Failed to delete trip")
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddFeature = async (feature: unknown) => {
    if (selectedDayForFeature) {
      setIsLoading(true)
      try {
        await addFeatureToDay(selectedDayForFeature.id, feature)
        showSuccess("Feature added to trip day!")
      } catch (error) {
        console.error("Failed to add feature:", error)
        showError("Failed to add feature to trip day.")
      } finally {
        setIsLoading(false)
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
        showError("Failed to add location to trip day.")
      } finally {
        setIsLoading(false)
      }
    }
  }

  const handleMoveItem = async (
    dayId: string,
    index: number,
    direction: "up" | "down",
    items: (DayLocation | TripFeature)[],
  ) => {
    if ((direction === "up" && index === 0) || (direction === "down" && index === items.length - 1)) return

    const newItems = [...items]
    const swapIndex = direction === "up" ? index - 1 : index + 1

    // Swap items
    const temp = newItems[index]
    newItems[index] = newItems[swapIndex]
    newItems[swapIndex] = temp

    // Update orders
    const reorderedItems = newItems.map((item, idx) => {
      // Determine type based on properties if 'type' is not present or reliable
      // DayLocation has 'day_id' (or trip_day_id), TripFeature has 'saved_id' or 'geometry'
      const isLocation = "city" in item || "town" in item || "country" in item
      return {
        id: isLocation ? (item as DayLocation).id : (item as TripFeature).saved_id,
        type: isLocation ? "location" : "feature",
        order: idx + 1,
      }
    })

    setIsLoading(true)
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await reorderItems(dayId, reorderedItems as any)
      showSuccess("Items reordered successfully!")
    } catch (error) {
      console.error("Failed to reorder items:", error)
      showError("Failed to reorder items.")
      throw error // Re-throw to let caller handle if needed, though we catch here
    } finally {
      setIsLoading(false)
    }
  }

  const filteredTrips = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    return trips.filter((trip) => {
      const startDate = new Date(trip.start_date)
      const endDate = new Date(trip.end_date)
      startDate.setHours(0, 0, 0, 0)
      endDate.setHours(0, 0, 0, 0)

      switch (tripFilter) {
        case "all":
          return true
        case "current":
          return startDate <= today && endDate >= today
        case "past":
          return endDate < today
        case "future":
          return startDate > today
        default:
          return true
      }
    })
  }, [trips, tripFilter])

  return (
    <>
      <FeatureDragContext savedFeatures={savedFeatures} selectedTab={selectedTab} setSavedFeatures={setSavedFeatures}>
        <Drawer
          anchor="left"
          open={drawerOpen}
          onClose={isPinned ? undefined : onClose} // Prevent closing if pinned
          variant={isPinned ? "persistent" : "temporary"}
          sx={{
            width: drawerWidth,
            flexShrink: 0,
            "& .MuiDrawer-paper": {
              width: drawerWidth,
              marginTop: "64px",
              height: "calc(100% - 64px)",
              boxSizing: "border-box",
            },
          }}
        >
          <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
            <Box sx={{ borderBottom: 1, borderColor: "divider", display: "flex", alignItems: "center" }}>
              <Tabs
                value={viewMode}
                onChange={(_, newValue) => setViewMode(newValue)}
                variant="standard"
                sx={{ flexGrow: 1 }}
              >
                <Tab label="Lists" value="lists" />
                <Tab label="Trips" value="trips" />
              </Tabs>
              <Tooltip title={isPinned ? "Unpin Sidebar" : "Pin Sidebar"}>
                <IconButton onClick={onTogglePin} sx={{ mr: 1, color: isPinned ? "primary.main" : "text.secondary" }}>
                  <MdPushPin />
                </IconButton>
              </Tooltip>
            </Box>

            {isLoading && (
              <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", p: 2 }}>
                <CircularProgress size={24} />
                <Typography variant="body2" sx={{ ml: 2 }}>
                  Loading...
                </Typography>
              </Box>
            )}

            <Box sx={{ flexGrow: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
              {isLoading && (
                <Box sx={{ display: "flex", justifyContent: "center", p: 2 }}>
                  <CircularProgress />
                </Box>
              )}
              {!isLoading && viewMode === "lists" ? (
                <Box sx={{ display: "flex", flexGrow: 1, overflow: "hidden" }}>
                  <Box sx={{ width: 150, bgcolor: "background.paper", borderRight: 1, borderColor: "divider" }}>
                    <TabList
                      tabs={Object.keys(savedFeatures)}
                      selectedTab={selectedTab}
                      handleTabChange={handleTabChange}
                      handleTabContextMenu={handleTabContextMenu}
                    />
                  </Box>
                  <Box sx={{ flexGrow: 1, display: "flex", flexDirection: "column", height: "100%" }}>
                    <Box sx={{ flexGrow: 1, overflowY: "auto", p: 2 }}>
                      <TextField
                        fullWidth
                        label="Search Features"
                        variant="outlined"
                        value={searchQuery}
                        onChange={handleSearchChange}
                        sx={{ mb: 1 }}
                      />
                      <Box sx={{ display: "flex", alignItems: "center", mb: 2, gap: 1 }}>
                        <Button
                          size="small"
                          startIcon={<FaFilter />}
                          onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                          variant={showAdvancedFilters ? "contained" : "outlined"}
                        >
                          Filter by Type
                        </Button>
                        {advancedFilters.types.length > 0 && (
                          <Typography variant="caption" color="text.secondary">
                            ({advancedFilters.types.length} selected)
                          </Typography>
                        )}
                      </Box>
                      <Collapse in={showAdvancedFilters}>
                        <Box sx={{ mb: 2 }}>
                          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                            {availableTypes.slice(0, 20).map((type) => (
                              <Chip
                                key={type}
                                label={type}
                                onClick={() => handleTypeToggle(type)}
                                color={advancedFilters.types.includes(type) ? "primary" : "default"}
                                size="small"
                                sx={{ mb: 1 }}
                              />
                            ))}
                          </Stack>
                          {availableTypes.length > 20 && (
                            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>
                              Showing 20 of {availableTypes.length} types
                            </Typography>
                          )}
                        </Box>
                      </Collapse>
                      <FeatureList
                        items={filteredItems}
                        setSavedFeatures={setSavedFeatures}
                        selectedTab={selectedTab}
                        selectedFeature={selectedFeature}
                        setSelectedFeature={setSelectedFeature}
                        handleContextMenu={handleContextMenu}
                        excludedProperties={Array.from(excludedProperties)}
                      />
                    </Box>
                  </Box>
                </Box>
              ) : (
                <Box sx={{ flexGrow: 1, display: "flex", flexDirection: "column" }}>
                  {!currentTrip && (
                    <TripListView
                      trips={filteredTrips}
                      tripFilter={tripFilter}
                      onTripFilterChange={setTripFilter}
                      onTripSelect={fetchTripDetails}
                      onTripDelete={handleDeleteTrip}
                      onCreateTrip={() => setIsCreateTripModalOpen(true)}
                    />
                  )}
                  {currentTrip && (
                    <TripDetailView
                      trip={currentTrip}
                      dayLocations={dayLocations}
                      dayFeatures={dayFeatures}
                      onBack={() => setCurrentTrip(null)}
                      onAddLocation={(id, date) => setSelectedDayForLocation({ id, date })}
                      onAddFeature={(id, date) => setSelectedDayForFeature({ id, date })}
                      onEditItem={(item, type) => setEditingItem({ item, type })}
                      onDeleteItem={(item, dayId) => {
                        if (item.type === "location") {
                          setDeleteConfirmation({
                            type: "location",
                            data: { id: item.id, dayId },
                          })
                        } else {
                          setDeleteConfirmation({
                            type: "feature",
                            data: { item: item as TripFeature, dayId },
                          })
                        }
                      }}
                      onMoveItem={handleMoveItem}
                      onFlyTo={onFlyTo}
                      onViewFeature={setViewingFeature}
                    />
                  )}
                </Box>
              )}
            </Box>

            <Box sx={{ p: 2, borderTop: 1, borderColor: "divider", bgcolor: "background.default" }}>
              {email ? (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                  <Typography variant="subtitle2">Logged in as:</Typography>
                  <Typography variant="body2" sx={{ fontWeight: "bold" }}>
                    {email}
                  </Typography>
                  <Button
                    variant="outlined"
                    size="small"
                    color="error"
                    onClick={() => {
                      setDeleteConfirmation({ type: "logout", data: null })
                    }}
                  >
                    Logout
                  </Button>
                </Box>
              ) : (
                <>
                  <Box sx={{ mb: 2 }}>
                    <Button fullWidth variant="contained" onClick={() => setIsAuthModalOpen(true)}>
                      Login / Sign Up
                    </Button>
                  </Box>
                  <Typography variant="subtitle2" gutterBottom>
                    Guest Sync
                  </Typography>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
                    <Typography
                      variant="caption"
                      sx={{ fontFamily: "monospace", bgcolor: "action.hover", p: 0.5, borderRadius: 1 }}
                    >
                      {userId}
                    </Typography>
                    <Button
                      size="small"
                      startIcon={<MdContentCopy />}
                      onClick={() => {
                        navigator.clipboard.writeText(userId)
                      }}
                    >
                      Copy
                    </Button>
                  </Box>
                  <Box sx={{ display: "flex", gap: 1 }}>
                    <TextField
                      size="small"
                      label="Enter ID to Sync"
                      value={inputUserId}
                      onChange={(e) => setInputUserId(e.target.value)}
                      fullWidth
                    />
                    <Button
                      variant="contained"
                      size="small"
                      onClick={() => {
                        if (inputUserId) {
                          setUserId(inputUserId)
                          setInputUserId("")
                        }
                      }}
                    >
                      Sync
                    </Button>
                  </Box>
                </>
              )}
            </Box>
          </Box>
        </Drawer>
        <AuthModal open={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
        <CreateTripModal
          open={isCreateTripModalOpen}
          onClose={() => setIsCreateTripModalOpen(false)}
          onCreateTrip={handleCreateTrip}
        />
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
        <AddFeatureModal
          open={!!selectedDayForFeature}
          onClose={() => setSelectedDayForFeature(null)}
          onAddFeature={handleAddFeature}
          dayDate={selectedDayForFeature?.date || ""}
        />
        <AddLocationModal
          open={!!selectedDayForLocation}
          onClose={() => setSelectedDayForLocation(null)}
          onAddLocation={handleAddLocation}
          dayDate={selectedDayForLocation?.date || ""}
        />
        <EditItemModal
          open={!!editingItem}
          onClose={() => setEditingItem(null)}
          onSave={handleSaveEdit}
          item={editingItem?.item || null}
          type={editingItem?.type === "Feature" ? "feature" : "location"}
          globalAnimationConfig={currentTrip?.animation_config}
        />
        <FeatureDetailsModal open={!!viewingFeature} onClose={() => setViewingFeature(null)} feature={viewingFeature} />
        <Dialog
          open={deleteConfirmation.type !== null}
          onClose={() => setDeleteConfirmation({ type: null, data: null })}
          disableEnforceFocus
          disableRestoreFocus
          sx={{ zIndex: (theme) => theme.zIndex.drawer + 2 }}
        >
          <DialogTitle>
            {deleteConfirmation.type === "feature" && "Delete Feature?"}
            {deleteConfirmation.type === "location" && "Delete Location?"}
            {deleteConfirmation.type === "trip" && "Delete Trip?"}
            {deleteConfirmation.type === "logout" && "Logout?"}
          </DialogTitle>
          <DialogContent>
            <DialogContentText>
              {deleteConfirmation.type === "feature" &&
                "Are you sure you want to remove this feature from the trip day?"}
              {deleteConfirmation.type === "location" &&
                "Are you sure you want to delete this location from the trip day?"}
              {deleteConfirmation.type === "trip" &&
                "Are you sure you want to delete this trip? This action cannot be undone."}
              {deleteConfirmation.type === "logout" && "Are you sure you want to logout?"}
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteConfirmation({ type: null, data: null })}>Cancel</Button>
            <Button
              onClick={() => {
                if (deleteConfirmation.type === "location") {
                  const data = deleteConfirmation.data as DeleteLocationData
                  deleteLocation(data.id, data.dayId)
                } else if (deleteConfirmation.type === "feature") {
                  // Delete feature from trip day using saved_id
                  const data = deleteConfirmation.data as DeleteFeatureData
                  const savedId = data.item.saved_id
                  if (savedId) {
                    deleteFeature(savedId, data.dayId)
                  }
                } else if (deleteConfirmation.type === "trip") {
                  const data = deleteConfirmation.data as DeleteTripData
                  deleteTrip(data.id)
                } else if (deleteConfirmation.type === "logout") {
                  logout()
                }
                setDeleteConfirmation({ type: null, data: null })
              }}
              color="error"
              variant="contained"
            >
              {deleteConfirmation.type === "logout" ? "Logout" : "Delete"}
            </Button>
          </DialogActions>
        </Dialog>
      </FeatureDragContext>
    </>
  )
}

export default SavedFeaturesDrawer
