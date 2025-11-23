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
  ListItemSecondaryAction,
  IconButton,
} from "@mui/material"
import React, { useState, useContext, useCallback, useEffect, useMemo } from "react"
import { MdContentCopy, MdDelete, MdArrowBack, MdAdd, MdLocationOn } from "react-icons/md"

import SavedFeaturesContext, { DEFAULT_CATEGORY } from "../../contexts/SavedFeaturesContext"
import { useTripContext, DayLocation } from "../../contexts/TripContext"
import { AuthModal } from "../Auth/AuthModal"
import { AddFeatureModal } from "../Trips/AddFeatureModal"
import { AddLocationModal } from "../Trips/AddLocationModal"
import { CreateTripModal } from "../Trips/CreateTripModal"

import { CategoryContextMenu } from "./ContextMenu/CategoryContextMenu"
import { FeatureContextMenu } from "./ContextMenu/FeatureContextMenu"
import { FeatureDragContext } from "./FeatureList/FeatureDragContext"
import { FeatureList } from "./FeatureList/FeatureList"
import { filterFeatures } from "./filterFeatures"
import { useCategoryManagement } from "./hooks/useCategoryManagement"
import { useContextMenu } from "./hooks/useContextMenu"
import { useFeatureManagement } from "./hooks/useFeatureManagement"
import { useFeatureSelection } from "./hooks/useFeatureSelection"
import { TabList } from "./TabList/TabList"

interface SavedFeaturesDrawerProps {
  drawerOpen: boolean
  onClose: () => void
  setCurrentCategory?: (newState: string) => void
}

const excludedProperties = ["id", "images", "style"] as const

const SavedFeaturesDrawer: React.FC<SavedFeaturesDrawerProps> = ({ drawerOpen, onClose, setCurrentCategory }) => {
  const [selectedTab, setSelectedTab] = useState<string>(DEFAULT_CATEGORY)
  const [searchQuery, setSearchQuery] = useState<string>("")
  const [inputUserId, setInputUserId] = useState<string>("")
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)
  const [viewMode, setViewMode] = useState<"lists" | "trips">("lists")
  const [isCreateTripModalOpen, setIsCreateTripModalOpen] = useState(false)
  const [selectedDayForFeature, setSelectedDayForFeature] = useState<{ id: string; date: string } | null>(null)
  const [selectedDayForLocation, setSelectedDayForLocation] = useState<{ id: string; date: string } | null>(null)

  const {
    trips,
    currentTrip,
    dayFeatures,
    dayLocations,
    fetchTripDetails,
    deleteTrip,
    setCurrentTrip,
    fetchDayFeatures,
    fetchDayLocations,
    addFeatureToDay,
    addLocationToDay,
    deleteLocation,
  } = useTripContext()

  const { savedFeatures, setSavedFeatures, removeFeature, userId, setUserId, email, logout } = useContext(SavedFeaturesContext)!
  const { selectedFeature, setSelectedFeature } = useFeatureSelection()
  const { contextMenu, contextMenuTab, contextMenuFeature, handleContextMenu, handleTabContextMenu, handleClose } = useContextMenu()
  const { moveCategory, handleRenameCategory, handleAddCategory, handleRemoveCategory } = useCategoryManagement(
    setSavedFeatures, setSelectedTab, savedFeatures, contextMenuTab)
  const { handleDuplicate, handleRemoveFromList, handleRemoveCompletely } = useFeatureManagement(
    setSavedFeatures, selectedTab, contextMenuFeature, removeFeature)

  const theme = useTheme()
  const isXs = useMediaQuery(theme.breakpoints.down("sm"))
  const isSm = useMediaQuery(theme.breakpoints.between("sm", "md"))
  const isMd = useMediaQuery(theme.breakpoints.between("md", "lg"))

  const drawerWidth = isMd ? "70%" : isSm ? "50%" : isXs ? "92%" : "50%"

  const handleTabChange = useCallback((_event: React.SyntheticEvent, newValue: string) => {
    setSelectedTab(newValue)
    setSelectedFeature(null)
  }, [setSelectedFeature])

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(event.target.value)
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
    return filterFeatures(itemsWithOriginalIndex, searchQuery)
  }, [itemsWithOriginalIndex, searchQuery])

  useEffect(() => {
    if (currentTrip?.days) {
      currentTrip.days.forEach((day) => {
        fetchDayFeatures(day.id)
        fetchDayLocations(day.id)
      })
    }
  }, [currentTrip, fetchDayFeatures, fetchDayLocations])

  const handleAddFeature = async (feature: unknown) => {
    if (selectedDayForFeature) {
      try {
        await addFeatureToDay(selectedDayForFeature.id, feature)
      } catch (error) {
        console.error("Failed to add feature:", error)
      }
    }
  }

  const handleAddLocation = async (location: Omit<DayLocation, "id" | "trip_day_id" | "created_at">) => {
    if (selectedDayForLocation) {
      try {
        await addLocationToDay(selectedDayForLocation.id, location)
      } catch (error) {
        console.error("Failed to add location:", error)
      }
    }
  }

  return (
    <>
      <FeatureDragContext savedFeatures={savedFeatures} selectedTab={selectedTab} setSavedFeatures={setSavedFeatures}>
        <Drawer
          anchor="left"
          open={drawerOpen}
          onClose={onClose}
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
            <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
              <Tabs
                value={viewMode}
                onChange={(_, newValue) => setViewMode(newValue)}
                variant="fullWidth"
              >
                <Tab label="Lists" value="lists" />
                <Tab label="Trips" value="trips" />
              </Tabs>
            </Box>

            <Box sx={{ flexGrow: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
              {viewMode === "lists" ? (
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
                        sx={{ mb: 2 }}
                      />
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
                <Box sx={{ flexGrow: 1, overflowY: "auto", p: 2 }}>
                  {currentTrip ? (
                    <Box>
                      <Button
                        startIcon={<MdArrowBack />}
                        onClick={() => setCurrentTrip(null)}
                        sx={{ mb: 2 }}
                      >
                        Back to Trips
                      </Button>
                      <Typography variant="h6">{currentTrip.name}</Typography>
                      <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
                        {new Date(currentTrip.start_date).toLocaleDateString()} - {new Date(currentTrip.end_date).toLocaleDateString()}
                      </Typography>

                      <List>
                        {currentTrip.days?.map((day) => {
                          const features = dayFeatures[day.id] || []
                          return (
                            <ListItem key={day.id} disablePadding sx={{ mb: 2, display: "block", border: 1, borderColor: "divider", borderRadius: 1 }}>
                              <Box sx={{ bgcolor: "action.hover", p: 1, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <Typography variant="subtitle2">
                                  Day {day.day_index + 1} - {new Date(day.date).toLocaleDateString()}
                                </Typography>
                                <Box>
                                  <Button
                                    size="small"
                                    startIcon={<MdLocationOn />}
                                    onClick={() => {
                                      setSelectedDayForLocation({ id: day.id, date: new Date(day.date).toLocaleDateString() })
                                    }}
                                    sx={{ mr: 1 }}
                                  >
                                    Add Loc
                                  </Button>
                                  <Button
                                    size="small"
                                    startIcon={<MdAdd />}
                                    onClick={() => {
                                      setSelectedDayForFeature({ id: day.id, date: new Date(day.date).toLocaleDateString() })
                                    }}
                                  >
                                    Add Feat
                                  </Button>
                                </Box>
                              </Box>
                              <Box sx={{ p: 1 }}>
                                {/* Locations Section */}
                                {dayLocations[day.id] && dayLocations[day.id].length > 0 && (
                                  <Box sx={{ mb: 2 }}>
                                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: "bold", textTransform: "uppercase" }}>
                                      Locations
                                    </Typography>
                                    <List dense>
                                      {dayLocations[day.id].map((location) => (
                                        <ListItem
                                          key={location.id}
                                          sx={{ pl: 0 }}
                                          secondaryAction={(
                                            <IconButton edge="end" size="small" onClick={() => deleteLocation(location.id, day.id)}>
                                              <MdDelete fontSize="small" />
                                            </IconButton>
                                          )}
                                        >
                                          <ListItemText
                                            primary={`${location.city || location.town || "Unknown"}, ${location.country}`}
                                            secondary={location.notes}
                                          />
                                        </ListItem>
                                      ))}
                                    </List>
                                  </Box>
                                )}

                                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: "bold", textTransform: "uppercase" }}>
                                  Features
                                </Typography>
                                {features.length === 0 ? (
                                  <Typography variant="body2" color="text.secondary">
                                    No features added yet.
                                  </Typography>
                                ) : (
                                  <List dense>
                                    {(features as unknown[]).map((feature, idx: number) => {
                                      const props = (feature as Record<string, unknown>).properties as Record<string, unknown> | undefined
                                      // eslint-disable-next-line react/prop-types
                                      const primaryText = String((props && (props.name || props.title)) || "Unnamed")
                                      // eslint-disable-next-line react/prop-types
                                      const secondaryText = String((props && (props.description || props.address)) || "")
                                      return (
                                        <ListItem key={idx} sx={{ pl: 0 }}>
                                          <ListItemText
                                            primary={primaryText}
                                            secondary={secondaryText}
                                          />
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
                  ) : (
                    <Box>
                      <Button
                        fullWidth
                        variant="contained"
                        onClick={() => setIsCreateTripModalOpen(true)}
                        sx={{ mb: 2 }}
                      >
                        Create New Trip
                      </Button>
                      <List>
                        {trips.map((trip) => (
                          <ListItem
                            key={trip.id}
                            disablePadding
                            sx={{ border: 1, borderColor: "divider", borderRadius: 1, mb: 1 }}
                          >
                            <Box
                              sx={{
                                width: "100%",
                                display: "flex",
                                alignItems: "center",
                                p: 1,
                                cursor: "pointer",
                                "&:hover": { bgcolor: "action.hover" },
                              }}
                              onClick={() => fetchTripDetails(trip.id)}
                            >
                              <ListItemText
                                primary={trip.name}
                                secondary={`${new Date(trip.start_date).toLocaleDateString()} - ${new Date(trip.end_date).toLocaleDateString()}`}
                              />
                              <ListItemSecondaryAction>
                                <IconButton
                                  edge="end"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    if (window.confirm("Delete this trip?")) {
                                      deleteTrip(trip.id)
                                    }
                                  }}
                                >
                                  <MdDelete />
                                </IconButton>
                              </ListItemSecondaryAction>
                            </Box>
                          </ListItem>
                        ))}
                      </List>
                      {trips.length === 0 && (
                        <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 4 }}>
                          No trips found. Create one to get started!
                        </Typography>
                      )}
                    </Box>
                  )}
                </Box>
              )}
            </Box>

            <Box sx={{ p: 2, borderTop: 1, borderColor: "divider", bgcolor: "background.default" }}>
              {email ? (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                  <Typography variant="subtitle2">Logged in as:</Typography>
                  <Typography variant="body2" sx={{ fontWeight: "bold" }}>{email}</Typography>
                  <Button
                    variant="outlined"
                    size="small"
                    color="error"
                    onClick={() => {
                      if (window.confirm("Are you sure you want to logout?")) {
                        logout()
                      }
                    }}
                  >
                    Logout
                  </Button>
                </Box>
              ) : (
                <>
                  <Box sx={{ mb: 2 }}>
                    <Button
                      fullWidth
                      variant="contained"
                      onClick={() => setIsAuthModalOpen(true)}
                    >
                      Login / Sign Up
                    </Button>
                  </Box>
                  <Typography variant="subtitle2" gutterBottom>Guest Sync</Typography>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
                    <Typography variant="caption" sx={{ fontFamily: "monospace", bgcolor: "action.hover", p: 0.5, borderRadius: 1 }}>
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
        <CreateTripModal open={isCreateTripModalOpen} onClose={() => setIsCreateTripModalOpen(false)} />
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
      </FeatureDragContext>
    </>
  )
}

export default SavedFeaturesDrawer
