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
import React, { useState, useContext, useCallback, useEffect } from "react"
import { MdPushPin, MdClose, MdDragIndicator } from "react-icons/md"

import SavedFeaturesContext from "../../contexts/SavedFeaturesContext"
import { useTripContext, Trip } from "../../contexts/TripContext"
import { showSuccess, showError } from "../../utils/notifications"
import { AuthModal } from "../Auth/AuthModal"
import { CreateTripModal } from "../Trips/CreateTripModal"

import { CategoryContextMenu } from "./ContextMenu/CategoryContextMenu"
import { FeatureContextMenu } from "./ContextMenu/FeatureContextMenu"
import { FeatureDragContext } from "./FeatureList/FeatureDragContext"
import { FeatureListView } from "./FeatureViews/FeatureListView"
import { useCategoryManagement } from "./hooks/useCategoryManagement"
import { useContextMenu } from "./hooks/useContextMenu"
import { useFeatureManagement } from "./hooks/useFeatureManagement"
import { useFeatureSelection } from "./hooks/useFeatureSelection"
import { TripListView } from "./TripViews/TripListView"

interface SavedFeaturesDrawerProps {
  drawerOpen: boolean
  onClose: () => void
  isPinned: boolean
  onTogglePin: () => void
  onTogglePin: () => void
}

const SavedFeaturesDrawer: React.FC<SavedFeaturesDrawerProps> = ({ drawerOpen, onClose, isPinned, onTogglePin }) => {
  const { savedFeatures, setSavedFeatures, removeFeature } = useContext(SavedFeaturesContext)!

  const {
    trips,
    currentTrip,

    createTrip,
    deleteTrip,
    setCurrentTrip,
  } = useTripContext()

  const [tripFilter, setTripFilter] = useState<"all" | "future" | "past" | "current">("all")

  const [drawerWidth, setDrawerWidth] = useState(() => {
    const saved = localStorage.getItem("drawerWidth")
    return saved ? parseInt(saved) : 500
  })
  const [isResizing, setIsResizing] = useState(false)

  // Handle resize
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return
      const newWidth = e.clientX
      if (newWidth >= 400 && newWidth <= 800) {
        setDrawerWidth(newWidth)
      }
    }

    const handleMouseUp = () => {
      if (isResizing) {
        setIsResizing(false)
        localStorage.setItem("drawerWidth", drawerWidth.toString())
      }
    }

    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove)
      document.addEventListener("mouseup", handleMouseUp)
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("mouseup", handleMouseUp)
    }
  }, [isResizing, drawerWidth])

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
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    type: "trip" | null
    data: { id: string } | null
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
          width: isPinned || !isMobile ? drawerWidth : "100%",
          maxWidth: isPinned || !isMobile ? drawerWidth : "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          pointerEvents: "auto",
          position: "relative",
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
            ) : (
              <TripListView
                trips={trips}
                tripFilter={tripFilter}
                onTripFilterChange={setTripFilter}
                onTripSelect={(id) => {
                  // Navigate to trip page
                  window.location.hash = `/trips/${id}`
                  if (onClose && !isPinned) onClose()
                }}
                onTripDelete={handleDeleteTrip}
                onCreateTrip={() => setIsCreateTripModalOpen(true)}
              />
            )}
          </>
        )}
      </Box>

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

      <Dialog open={!!deleteConfirmation.type} onClose={() => setDeleteConfirmation({ type: null, data: null })}>
        <DialogTitle>
          {deleteConfirmation.type === "trip"
            ? "Delete Trip"
            : "Are you sure you want to delete this trip? This action cannot be undone."}
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            {deleteConfirmation.type === "trip"
              ? "Are you sure you want to delete this trip? This action cannot be undone."
              : ""}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmation({ type: null, data: null })}>Cancel</Button>
          <Button
            onClick={() => {
              if (deleteConfirmation.type === "trip") {
                confirmDeleteTrip()
              }
            }}
            color="error"
            autoFocus
          >
            Confirm
          </Button>
        </DialogActions>
      </Dialog>

      {/* Resize Handle */}
      {(isPinned || !isMobile) && (
        <Box
          onMouseDown={() => setIsResizing(true)}
          sx={{
            position: "absolute",
            top: 0,
            right: 0,
            bottom: 0,
            width: 8,
            cursor: "ew-resize",
            bgcolor: isResizing ? "primary.main" : "transparent",
            "&:hover": {
              bgcolor: "primary.light",
            },
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "background-color 0.2s",
            zIndex: 1300,
          }}
        >
          <MdDragIndicator
            style={{
              opacity: isResizing ? 1 : 0.3,
              transition: "opacity 0.2s",
            }}
          />
        </Box>
      )}
    </Drawer>
  )
}

export default SavedFeaturesDrawer
