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
  List,
  ListItem,
  ListItemText,
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
import { FaDownload, FaFilter } from "react-icons/fa"
import {
  MdContentCopy,
  MdDelete,
  MdArrowBack,
  MdAdd,
  MdLocationOn,
  MdArrowUpward,
  MdArrowDownward,
  MdEdit,
  MdDirectionsCar,
  MdPushPin,
  MdVisibility,
  MdMyLocation,
} from "react-icons/md"

import { getTransportIconComponent } from "../../constants/transportModes"
import SavedFeaturesContext, { DEFAULT_CATEGORY } from "../../contexts/SavedFeaturesContext"
import { useTripContext, DayLocation, TripFeature, Trip } from "../../contexts/TripContext"
import { showSuccess, showError } from "../../utils/notifications"
import { AuthModal } from "../Auth/AuthModal"
import { exportTripToGeoJSON, exportTripToKML } from "../TopMenu/exportTrip"
import { exportTripToExcel } from "../TopMenu/exportTripToExcel"
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
import { TripListView } from "./TripViews/TripListView"

interface SavedFeaturesDrawerProps {
  drawerOpen: boolean
  onClose: () => void
  setCurrentCategory?: (newState: string) => void
  isPinned: boolean
  onTogglePin: () => void
  onFlyTo: (lat: number, lng: number) => void
}

type ListItemType = (DayLocation & { type: "location" }) | (TripFeature & { type: "Feature" })

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
    type: "feature" | "location" | "trip" | "logout" | null
    data?: unknown
  }>({
    type: null,
    data: null,
  })

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

  const handleMoveItem = async (dayId: string, index: number, direction: "up" | "down", items: ListItemType[]) => {
    if ((direction === "up" && index === 0) || (direction === "down" && index === items.length - 1)) return

    const newItems = [...items]
    const swapIndex = direction === "up" ? index - 1 : index + 1

    // Swap items
    const temp = newItems[index]
    newItems[index] = newItems[swapIndex]
    newItems[swapIndex] = temp

    // Update orders
    const reorderedItems = newItems.map((item, idx) => ({
      id: item.type === "Feature" ? (item as TripFeature).saved_id : (item as DayLocation).id, // Use saved_id for features
      type: item.type === "Feature" ? "feature" : "location",
      order: idx + 1,
    }))

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

  const handleSaveEdit = async (_id: string, data: Partial<DayLocation> | Partial<TripFeature>) => {
    if (!editingItem) return

    const API_URL = import.meta.env.VITE_API_URL || ""
    setIsLoading(true)
    try {
      if (editingItem.type === "location") {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await fetch(`${API_URL}/api/day-locations/${(editingItem.item as any).id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...editingItem.item, ...data }),
        })
        showSuccess("Location updated successfully!")
      } else {
        // Feature update
        const feature = editingItem.item as TripFeature
        await fetch(`${API_URL}/api/features`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            user_id: userId,
            feature: feature,
            ...data,
          }),
        })
        showSuccess("Feature updated successfully!")
      }
      // Refresh trip
      if (currentTrip) fetchTripDetails(currentTrip.id)
    } catch (error) {
      console.error("Failed to update item:", error)
      showError("Failed to update item.")
    } finally {
      setIsLoading(false)
    }
  }

  const getTransportIcon = (mode?: string) => {
    const Icon = getTransportIconComponent(mode)
    return Icon ? <Icon /> : <MdDirectionsCar />
  }

  const calculateEndTime = (startTime?: string, duration?: number) => {
    if (!startTime || !duration) return null
    const [hours, minutes] = startTime.split(":").map(Number)
    const date = new Date()
    date.setHours(hours, minutes)
    date.setMinutes(date.getMinutes() + duration)
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false })
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
                    <Box sx={{ flexGrow: 1, overflowY: "auto", p: 2 }}>
                      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
                        <Button startIcon={<MdArrowBack />} onClick={() => setCurrentTrip(null)}>
                          Back to Trips
                        </Button>
                        <Button
                          variant="outlined"
                          size="small"
                          startIcon={<FaDownload />}
                          onClick={(e) => {
                            const menu = document.createElement("div")
                            const rect = e.currentTarget.getBoundingClientRect()
                            menu.style.position = "fixed"
                            menu.style.top = `${rect.bottom + 5}px`
                            menu.style.right = `${window.innerWidth - rect.right}px`
                            menu.style.zIndex = "9999"
                            menu.style.background = "white"
                            menu.style.border = "1px solid #ccc"
                            menu.style.borderRadius = "4px"
                            menu.style.boxShadow = "0 2px 8px rgba(0,0,0,0.15)"
                            menu.innerHTML = `
                              <div style="padding: 8px 0;">
                                <div class="export-option" style="padding: 8px 16px; cursor: pointer;" data-format="geojson">GeoJSON</div>
                                <div class="export-option" style="padding: 8px 16px; cursor: pointer;" data-format="kml">KML</div>
                                <div class="export-option" style="padding: 8px 16px; cursor: pointer;" data-format="excel">Excel</div>
                              </div>
                            `
                            document.body.appendChild(menu)

                            const handleExport = (format: string) => {
                              const exportData = {
                                trip: currentTrip,
                                locations: dayLocations,
                                features: dayFeatures,
                              }
                              if (format === "geojson") exportTripToGeoJSON(exportData)
                              else if (format === "kml") exportTripToKML(exportData)
                              else if (format === "excel") exportTripToExcel(exportData)
                              document.body.removeChild(menu)
                            }

                            menu.querySelectorAll(".export-option").forEach((opt) => {
                              opt.addEventListener("mouseenter", () => {
                                ;(opt as HTMLElement).style.background = "#f5f5f5"
                              })
                              opt.addEventListener("mouseleave", () => {
                                ;(opt as HTMLElement).style.background = "white"
                              })
                              opt.addEventListener("click", () => {
                                handleExport(opt.getAttribute("data-format")!)
                              })
                            })

                            const closeMenu = () => {
                              if (document.body.contains(menu)) {
                                document.body.removeChild(menu)
                              }
                            }
                            setTimeout(() => {
                              document.addEventListener("click", closeMenu, { once: true })
                            }, 100)
                          }}
                        >
                          Export
                        </Button>
                      </Box>
                      <Typography variant="h6">{currentTrip.name}</Typography>
                      <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
                        {new Date(currentTrip.start_date).toLocaleDateString()} -{" "}
                        {new Date(currentTrip.end_date).toLocaleDateString()}
                      </Typography>

                      <List>
                        {currentTrip.days?.map((day) => {
                          const locs = (dayLocations[day.id] || []).map((l) => ({ ...l, type: "location" as const }))
                          const feats = (dayFeatures[day.id] || []).map((f) => ({ ...f, type: "Feature" as const }))
                          const items = [...locs, ...feats].sort((a, b) => (a.visit_order || 0) - (b.visit_order || 0))

                          return (
                            <ListItem
                              key={day.id}
                              disablePadding
                              sx={{ mb: 2, display: "block", border: 1, borderColor: "divider", borderRadius: 1 }}
                            >
                              <Box
                                sx={{
                                  bgcolor: "action.hover",
                                  p: 1,
                                  display: "flex",
                                  justifyContent: "space-between",
                                  alignItems: "center",
                                }}
                              >
                                <Typography variant="subtitle2">
                                  Day {day.day_index + 1} - {new Date(day.date).toLocaleDateString()}
                                </Typography>
                                <Box>
                                  <Button
                                    size="small"
                                    startIcon={<MdLocationOn />}
                                    onClick={() => {
                                      setSelectedDayForLocation({
                                        id: day.id,
                                        date: new Date(day.date).toLocaleDateString(),
                                      })
                                    }}
                                    sx={{ mr: 1 }}
                                  >
                                    Add Loc
                                  </Button>
                                  <Button
                                    size="small"
                                    startIcon={<MdAdd />}
                                    onClick={() => {
                                      setSelectedDayForFeature({
                                        id: day.id,
                                        date: new Date(day.date).toLocaleDateString(),
                                      })
                                    }}
                                  >
                                    Add Feat
                                  </Button>
                                </Box>
                              </Box>
                              <Box sx={{ p: 1 }}>
                                {items.length === 0 ? (
                                  <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 2 }}>
                                    No items added yet.
                                  </Typography>
                                ) : (
                                  <List dense>
                                    {items.map((item, idx) => {
                                      const isLocation = item.type === "location"
                                      const primaryText = isLocation
                                        ? `${item.city || item.town || "Unknown"}, ${item.country}`
                                        : item.properties.name || item.properties.title || "Unnamed Feature"

                                      const secondaryText = isLocation
                                        ? item.notes
                                        : (item.properties.description as string) ||
                                          (item.properties.address as string) ||
                                          ""

                                      // Use saved_id for features to ensure uniqueness
                                      const key = isLocation ? item.id : item.saved_id || item.properties.id

                                      const endTime =
                                        item.end_time || calculateEndTime(item.start_time, item.duration_minutes)

                                      return (
                                        <ListItem
                                          key={key}
                                          sx={{
                                            pl: 0,
                                            borderBottom: idx < items.length - 1 ? 1 : 0,
                                            borderColor: "divider",
                                            flexDirection: "column",
                                            alignItems: "stretch",
                                          }}
                                        >
                                          <Box
                                            sx={{
                                              display: "flex",
                                              justifyContent: "space-between",
                                              alignItems: "flex-start",
                                              width: "100%",
                                            }}
                                          >
                                            <Box sx={{ display: "flex", alignItems: "center", flexGrow: 1 }}>
                                              <Box sx={{ display: "flex", flexDirection: "column", mr: 1 }}>
                                                <IconButton
                                                  size="small"
                                                  onClick={() => handleMoveItem(day.id, idx, "up", items)}
                                                  disabled={idx === 0}
                                                >
                                                  <MdArrowUpward fontSize="small" />
                                                </IconButton>
                                                <IconButton
                                                  size="small"
                                                  onClick={() => handleMoveItem(day.id, idx, "down", items)}
                                                  disabled={idx === items.length - 1}
                                                >
                                                  <MdArrowDownward fontSize="small" />
                                                </IconButton>
                                              </Box>
                                              <ListItemText
                                                primary={
                                                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                                    {primaryText}
                                                    {item.start_time && (
                                                      <Tooltip
                                                        title={`Start: ${item.start_time}${endTime ? ` - End: ${endTime}` : ""}`}
                                                      >
                                                        <Typography
                                                          variant="caption"
                                                          sx={{
                                                            bgcolor: "primary.main",
                                                            color: "white",
                                                            px: 0.5,
                                                            borderRadius: 0.5,
                                                            cursor: "help",
                                                          }}
                                                        >
                                                          {item.start_time.slice(0, 5)}
                                                          {endTime && ` - ${endTime.slice(0, 5)}`}
                                                        </Typography>
                                                      </Tooltip>
                                                    )}
                                                  </Box>
                                                }
                                                secondary={secondaryText}
                                              />
                                            </Box>
                                            <Box>
                                              <Tooltip title="Locate on Map">
                                                <IconButton
                                                  size="small"
                                                  onClick={() => {
                                                    if (isLocation) {
                                                      if (item.latitude && item.longitude)
                                                        onFlyTo(item.latitude, item.longitude)
                                                    } else {
                                                      // Feature geometry
                                                      const coords = (item as TripFeature).geometry?.coordinates
                                                      if (coords) {
                                                        // GeoJSON is [lng, lat]
                                                        onFlyTo(coords[1], coords[0])
                                                      }
                                                    }
                                                  }}
                                                >
                                                  <MdMyLocation fontSize="small" />
                                                </IconButton>
                                              </Tooltip>
                                              {!isLocation && (
                                                <Tooltip title="View Details">
                                                  <IconButton
                                                    size="small"
                                                    onClick={() => setViewingFeature(item as TripFeature)}
                                                  >
                                                    <MdVisibility fontSize="small" />
                                                  </IconButton>
                                                </Tooltip>
                                              )}
                                              <IconButton
                                                size="small"
                                                onClick={() => setEditingItem({ item, type: item.type })}
                                              >
                                                <MdEdit fontSize="small" />
                                              </IconButton>
                                              <IconButton
                                                size="small"
                                                onClick={(e) => {
                                                  e.stopPropagation()
                                                  if (isLocation) {
                                                    setDeleteConfirmation({
                                                      type: "location",
                                                      data: { id: item.id, dayId: day.id },
                                                    })
                                                  } else {
                                                    setDeleteConfirmation({
                                                      type: "feature",
                                                      data: { item, dayId: day.id },
                                                    })
                                                  }
                                                }}
                                              >
                                                <MdDelete fontSize="small" />
                                              </IconButton>
                                            </Box>
                                          </Box>

                                          {/* Transport Details */}
                                          {(item.transport_mode || item.transport_details || item.duration_minutes) && (
                                            <Box
                                              sx={{
                                                mt: 1,
                                                ml: 5,
                                                p: 1,
                                                bgcolor: "action.hover",
                                                borderRadius: 1,
                                                display: "flex",
                                                alignItems: "center",
                                                gap: 2,
                                              }}
                                            >
                                              {item.transport_mode && (
                                                <Box
                                                  sx={{
                                                    display: "flex",
                                                    alignItems: "center",
                                                    gap: 0.5,
                                                    color: "primary.main",
                                                  }}
                                                >
                                                  {getTransportIcon(item.transport_mode)}
                                                  <Typography variant="caption" fontWeight="bold">
                                                    {item.transport_mode}
                                                  </Typography>
                                                </Box>
                                              )}
                                              {item.duration_minutes && (
                                                <Typography variant="caption">{item.duration_minutes} min</Typography>
                                              )}
                                              {item.transport_cost && (
                                                <Typography variant="caption">${item.transport_cost}</Typography>
                                              )}
                                              {item.transport_details && (
                                                <Typography variant="caption" color="text.secondary">
                                                  {item.transport_details}
                                                </Typography>
                                              )}
                                            </Box>
                                          )}
                                        </ListItem>
                                      )
                                    })}
                                  </List>
                                )}
                              </Box>
                            </ListItem>
                          )
                        })}
                      </List>
                    </Box>
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
