import DirectionsBikeIcon from "@mui/icons-material/DirectionsBike"
import DirectionsCarIcon from "@mui/icons-material/DirectionsCar"
import DirectionsTransitIcon from "@mui/icons-material/DirectionsTransit"
import DirectionsWalkIcon from "@mui/icons-material/DirectionsWalk"
import FlightIcon from "@mui/icons-material/Flight"
import MoreHorizIcon from "@mui/icons-material/MoreHoriz"
import {
  Box,
  Typography,
  Button,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Tooltip,
  Collapse,
  Avatar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Switch,
  FormControlLabel,
  Stack,
  Menu,
  MenuItem,
} from "@mui/material"
import React, { useState, useEffect } from "react"
import {
  MdArrowBack,
  MdLocationOn,
  MdAdd,
  MdArrowUpward,
  MdArrowDownward,
  MdEdit,
  MdDelete,
  MdMyLocation,
  MdVisibility,
  MdExpandMore,
  MdExpandLess,
  MdContentCopy,
  MdCheckBox,
  MdCheckBoxOutlineBlank,
  MdViewList,
  MdCalendarToday,
  MdAccessTime,
  MdCompareArrows,
  MdFileDownload,
  MdViewModule,
} from "react-icons/md"

import { Trip, DayLocation, TripFeature, useTripContext } from "../../../contexts/TripContext"
import { getCategoryColor } from "../../../utils/colorUtils"
import { calculateDistance, estimateTravelTime } from "../../../utils/distanceUtils"
import { getFeatureThumbnail, getCategoryPlaceholder } from "../../../utils/imageUtils"
import { calculateEndTime } from "../../../utils/timeUtils"
import CalendarViews from "../../Calendar/CalendarViews"
import { exportTripToGeoJSON, exportTripToKML } from "../../TopMenu/exportTrip"
import { exportTripToExcel } from "../../TopMenu/exportTripToExcel"
import { exportTripToPDF } from "../../TopMenu/exportTripToPDF"
import { TripCalendarView } from "../../TripCalendar/TripCalendarView"
import TripCanvas from "../../TripCanvas/TripCanvas"
import { TripComparisonModal } from "../../TripComparison/TripComparisonModal"
import { EditTimeModal } from "../../Trips/EditTimeModal"
import { EditTransportModal } from "../../Trips/EditTransportModal"
import { TripSummary } from "../../Trips/TripSummary"

const getTransportIcon = (mode: string) => {
  switch (mode) {
    case "driving":
    case "car":
      return <DirectionsCarIcon fontSize="small" />
    case "walking":
    case "walk":
      return <DirectionsWalkIcon fontSize="small" />
    case "cycling":
    case "bike":
      return <DirectionsBikeIcon fontSize="small" />
    case "transit":
    case "train":
    case "bus":
    case "ferry":
      return <DirectionsTransitIcon fontSize="small" />
    case "flight":
      return <FlightIcon fontSize="small" />
    default:
      return <DirectionsCarIcon fontSize="small" />
  }
}

interface TransportConnectorProps {
  item: DayLocation | TripFeature
  distance?: number
  onClick: () => void
}

const TransportConnector: React.FC<TransportConnectorProps> = ({ item, distance, onClick }) => {
  const hasTransport = !!item.transport_mode
  const cost = item.transport_cost
  const duration = item.travel_time_minutes || item.duration_minutes // Fallback if travel_time not set

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        py: 1,
        px: 2,
        ml: 4,
        borderLeft: "2px dashed #ccc",
        position: "relative",
      }}
    >
      <Box
        sx={{
          position: "absolute",
          left: -11,
          top: "50%",
          marginTop: "-10px",
          bgcolor: "background.paper",
        }}
      >
        <IconButton
          size="small"
          onClick={onClick}
          sx={{
            border: "1px solid #e0e0e0",
            width: 20,
            height: 20,
            p: 0,
          }}
        >
          <MoreHorizIcon sx={{ fontSize: 14 }} />
        </IconButton>
      </Box>

      {hasTransport ? (
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            cursor: "pointer",
            "&:hover": { bgcolor: "action.hover", borderRadius: 1 },
          }}
          onClick={onClick}
        >
          <Box sx={{ color: "text.secondary", mr: 1, display: "flex" }}>
            {getTransportIcon(item.transport_mode || "")}
          </Box>
          <Typography variant="caption" color="text.secondary">
            {duration ? `${duration} min` : ""}
            {duration && cost ? " • " : ""}
            {cost ? `$${cost}` : ""}
            {distance ? ` • ${distance.toFixed(1)} km` : ""}
          </Typography>
        </Box>
      ) : (
        <Tooltip title="Add transport">
          <Typography
            variant="caption"
            color="text.disabled"
            sx={{ cursor: "pointer", fontStyle: "italic" }}
            onClick={onClick}
          >
            Add transport... {distance ? `(${distance.toFixed(1)} km)` : ""}
          </Typography>
        </Tooltip>
      )}
    </Box>
  )
}

interface TripDetailViewProps {
  trip: Trip
  dayLocations: Record<string, DayLocation[]>
  dayFeatures: Record<string, TripFeature[]>
  onBack: () => void
  onAddLocation: (dayId: string, date: string) => void
  onAddFeature: (dayId: string, date: string) => void
  onEditItem: (item: DayLocation | TripFeature, type: "location" | "Feature") => void
  onDeleteItem: (item: DayLocation | TripFeature, dayId: string) => void
  onMoveItem: (dayId: string, index: number, direction: "up" | "down", items: (DayLocation | TripFeature)[]) => void
  onFlyTo: (lat: number, lng: number) => void
  onViewFeature: (feature: TripFeature) => void
  isPlanningMode: boolean
  onTogglePlanningMode: () => void
}

export const TripDetailView: React.FC<TripDetailViewProps> = ({
  trip,
  dayLocations,
  dayFeatures,
  onBack,
  onAddLocation,
  onAddFeature,
  onEditItem,
  onDeleteItem,
  onMoveItem,
  onFlyTo,
  onViewFeature,
  isPlanningMode,
  onTogglePlanningMode,
}) => {
  const [expandedDays, setExpandedDays] = useState<Record<string, boolean>>({})
  const [copyDialogOpen, setCopyDialogOpen] = useState(false)
  const [comparisonModalOpen, setComparisonModalOpen] = useState(false)
  const [viewMode, setViewMode] = useState<"list" | "calendar" | "newCalendar" | "canvas">(() => {
    const saved = localStorage.getItem("tripDetailViewMode")
    return (saved as "list" | "calendar" | "newCalendar" | "canvas") || "list"
  })
  const [newTripName, setNewTripName] = useState("")
  const [newStartDate, setNewStartDate] = useState("")
  const [exportAnchorEl, setExportAnchorEl] = useState<null | HTMLElement>(null)
  const [editTimeModalOpen, setEditTimeModalOpen] = useState(false)
  const [editingTimeItem, setEditingTimeItem] = useState<DayLocation | TripFeature | null>(null)
  const [editTransportModalOpen, setEditTransportModalOpen] = useState(false)
  const [editingTransportItem, setEditingTransportItem] = useState<DayLocation | TripFeature | null>(null)
  const { copyTrip, updateLocationVisitStatus, updateFeatureVisitStatus, reorderItems, updateLocation, updateFeature } =
    useTripContext()

  // Initialize all days as expanded
  useEffect(() => {
    const initialExpandedState: Record<string, boolean> = {}
    trip.days?.forEach((day) => {
      initialExpandedState[day.id] = true
    })
    setExpandedDays(initialExpandedState)
  }, [trip.days])

  const toggleDay = (dayId: string) => {
    setExpandedDays((prev) => ({
      ...prev,
      [dayId]: !prev[dayId],
    }))
  }

  const expandAll = () => {
    const next: Record<string, boolean> = {}
    trip.days?.forEach((d) => {
      next[d.id] = true
    })
    setExpandedDays(next)
  }

  const collapseAll = () => {
    setExpandedDays({})
  }

  const handleToggleVisit = async (item: DayLocation | TripFeature, dayId: string) => {
    const isVisited = item.visited !== undefined ? item.visited : true
    const isPlanned = item.planned !== undefined ? item.planned : false

    const newVisited = !isVisited

    if ("type" in item && item.type === "Feature") {
      const feature = item as TripFeature
      const id = feature.saved_id || feature.properties.id
      if (id) {
        await updateFeatureVisitStatus(id, dayId, newVisited, isPlanned)
      }
    } else {
      const location = item as DayLocation
      await updateLocationVisitStatus(location.id, dayId, newVisited, isPlanned)
    }
  }

  const handleExport = (format: string) => {
    // dayLocations and dayFeatures are already Records
    const exportData = {
      trip,
      locations: dayLocations,
      features: dayFeatures,
    }

    switch (format) {
      case "geojson":
        exportTripToGeoJSON(exportData)
        break
      case "kml":
        exportTripToKML(exportData)
        break
      case "excel":
        exportTripToExcel(exportData)
        break
      case "pdf":
        exportTripToPDF(trip, dayLocations, dayFeatures)
        break
    }
  }

  return (
    <Box sx={{ flexGrow: 1, minHeight: 0, overflowY: "auto", p: 2 }}>
      {/* Header Row 1: Navigation & Main Actions */}
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
        <Button startIcon={<MdArrowBack />} onClick={onBack} size="small">
          Back
        </Button>
        <Typography variant="h6" noWrap sx={{ mx: 2, flexGrow: 1, textAlign: "center" }}>
          {trip.name}
        </Typography>
        <Box sx={{ display: "flex", gap: 1 }}>{/* Add Trip Edit/Delete actions here if needed in future */}</Box>
      </Box>

      {/* Header Row 2: Toolbar */}
      <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2, flexWrap: "wrap" }}>
        {/* View Toggle */}
        <Box sx={{ display: "flex", border: 1, borderColor: "divider", borderRadius: 1 }}>
          <Tooltip title="List View">
            <IconButton
              size="small"
              onClick={() => {
                setViewMode("list")
                localStorage.setItem("tripDetailViewMode", "list")
              }}
              color={viewMode === "list" ? "primary" : "default"}
              sx={{ borderRadius: 0 }}
            >
              <MdViewList />
            </IconButton>
          </Tooltip>
          <Tooltip title="Calendar View (Old)">
            <IconButton
              size="small"
              onClick={() => {
                setViewMode("calendar")
                localStorage.setItem("tripDetailViewMode", "calendar")
              }}
              color={viewMode === "calendar" ? "primary" : "default"}
              sx={{ borderRadius: 0 }}
            >
              <MdCalendarToday />
            </IconButton>
          </Tooltip>
          <Tooltip title="Calendar Views (New)">
            <IconButton
              size="small"
              onClick={() => {
                setViewMode("newCalendar")
                localStorage.setItem("tripDetailViewMode", "newCalendar")
              }}
              color={viewMode === "newCalendar" ? "primary" : "default"}
              sx={{ borderRadius: 0 }}
            >
              <MdViewModule />
            </IconButton>
          </Tooltip>
          <Tooltip title="Trip Canvas (New Editor)">
            <IconButton
              size="small"
              onClick={() => setViewMode("canvas")}
              color={viewMode === "canvas" ? "primary" : "default"}
              sx={{ borderRadius: 0 }}
            >
              <MdViewModule />
            </IconButton>
          </Tooltip>
        </Box>

        {/* Planning Mode */}
        <FormControlLabel
          control={<Switch checked={isPlanningMode} onChange={onTogglePlanningMode} size="small" color="primary" />}
          label={<Typography variant="body2">Planning Mode</Typography>}
          sx={{ mr: 0 }}
        />

        <Box sx={{ flexGrow: 1 }} />

        {/* Compare */}
        <Tooltip title="Compare Plan vs. Actual">
          <IconButton onClick={() => setComparisonModalOpen(true)} size="small" color="primary">
            <MdCompareArrows />
          </IconButton>
        </Tooltip>

        {/* Export */}
        <Box>
          <Button
            variant="outlined"
            size="small"
            startIcon={<MdFileDownload />}
            onClick={(e) => setExportAnchorEl(e.currentTarget)}
          >
            Export
          </Button>
          <Menu anchorEl={exportAnchorEl} open={Boolean(exportAnchorEl)} onClose={() => setExportAnchorEl(null)}>
            <MenuItem
              onClick={() => {
                handleExport("geojson")
                setExportAnchorEl(null)
              }}
            >
              GeoJSON
            </MenuItem>
            <MenuItem
              onClick={() => {
                handleExport("kml")
                setExportAnchorEl(null)
              }}
            >
              KML
            </MenuItem>
            <MenuItem
              onClick={() => {
                handleExport("excel")
                setExportAnchorEl(null)
              }}
            >
              Excel
            </MenuItem>
            <MenuItem
              onClick={() => {
                handleExport("pdf")
                setExportAnchorEl(null)
              }}
            >
              PDF
            </MenuItem>
          </Menu>
        </Box>

        {/* Copy Trip */}
        <Button
          variant="outlined"
          size="small"
          startIcon={<MdContentCopy />}
          onClick={() => {
            setCopyDialogOpen(true)
            setNewTripName(`${trip.name} (Copy)`)
            setNewStartDate(new Date().toISOString().split("T")[0])
          }}
        >
          Copy
        </Button>
      </Stack>
      <Dialog open={copyDialogOpen} onClose={() => setCopyDialogOpen(false)}>
        <DialogTitle>Copy Trip</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Trip Name"
            fullWidth
            value={newTripName}
            onChange={(e) => setNewTripName(e.target.value)}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="Start Date"
            type="date"
            fullWidth
            value={newStartDate}
            onChange={(e) => setNewStartDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCopyDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={async () => {
              try {
                await copyTrip(trip.id, newTripName, newStartDate)
                setCopyDialogOpen(false)
                // Optionally navigate to the new trip or show success message
              } catch (error) {
                console.error("Failed to copy trip:", error)
              }
            }}
            variant="contained"
            disabled={!newTripName || !newStartDate}
          >
            Copy
          </Button>
        </DialogActions>
      </Dialog>

      <Typography variant="body2" color="text.secondary" gutterBottom sx={{ textAlign: "center", mb: 2 }}>
        {new Date(trip.start_date).toLocaleDateString()} - {new Date(trip.end_date).toLocaleDateString()}
      </Typography>

      {/* Trip Summary Statistics */}
      <TripSummary dayLocations={dayLocations} dayFeatures={dayFeatures} />

      {/* Expand/Collapse All */}
      <Box sx={{ display: "flex", gap: 1, mb: 1 }}>
        <Button size="small" onClick={expandAll}>
          Expand All
        </Button>
        <Button size="small" onClick={collapseAll}>
          Collapse All
        </Button>
      </Box>

      {/* Calendar/List/Canvas View Conditional Rendering */}
      {viewMode === "canvas" ? (
        <TripCanvas tripId={trip.id} onBack={() => setViewMode("list")} />
      ) : viewMode === "newCalendar" ? (
        <CalendarViews tripId={trip.id} />
      ) : viewMode === "calendar" ? (
        <TripCalendarView
          trip={trip}
          dayLocations={dayLocations}
          dayFeatures={dayFeatures}
          onItemMoved={async (itemId, _itemType, fromDayId, toDayId, newOrder) => {
            // Get items from both days
            const fromItems = [
              ...(dayLocations[fromDayId] || []).map((l) => ({ ...l, type: "location" as const })),
              ...(dayFeatures[fromDayId] || []).map((f) => ({ ...f, type: "Feature" as const })),
            ].sort((a, b) => (a.visit_order || 0) - (b.visit_order || 0))

            const toItems = [
              ...(dayLocations[toDayId] || []).map((l) => ({ ...l, type: "location" as const })),
              ...(dayFeatures[toDayId] || []).map((f) => ({ ...f, type: "Feature" as const })),
            ].sort((a, b) => (a.visit_order || 0) - (b.visit_order || 0))

            // Remove item from source
            const movedItem = fromItems.find((item) => {
              const id = item.type === "location" ? item.id : item.saved_id || item.properties.id
              return id === itemId
            })

            if (!movedItem) return

            // If same day, just reorder
            if (fromDayId === toDayId) {
              const updatedItems = fromItems.filter((item) => {
                const id = item.type === "location" ? item.id : item.saved_id || item.properties.id
                return id !== itemId
              })

              // Insert at new position
              // Ensure newOrder is within bounds
              const targetIndex = Math.min(Math.max(0, newOrder), updatedItems.length)
              updatedItems.splice(targetIndex, 0, movedItem)

              const payload = updatedItems.map((item, idx) => ({
                id: item.type === "location" ? item.id : item.saved_id || item.properties.id,
                type: item.type === "location" ? ("location" as const) : ("feature" as const),
                order: idx,
              }))

              await reorderItems(fromDayId, payload)
              return
            }

            // Remove from source
            const updatedFromItems = fromItems.filter((item) => {
              const id = item.type === "location" ? item.id : item.saved_id || item.properties.id
              return id !== itemId
            })

            // Add to target at newOrder
            const updatedToItems = [...toItems]
            const targetIndex = Math.min(Math.max(0, newOrder), updatedToItems.length)
            updatedToItems.splice(targetIndex, 0, movedItem)

            // Reorder source day
            const fromPayload = updatedFromItems.map((item, idx) => ({
              id: item.type === "location" ? item.id : item.saved_id || item.properties.id,
              type: item.type === "location" ? ("location" as const) : ("feature" as const),
              order: idx,
            }))

            // Reorder target day
            const toPayload = updatedToItems.map((item, idx) => ({
              id: item.type === "location" ? item.id : item.saved_id || item.properties.id,
              type: item.type === "location" ? ("location" as const) : ("feature" as const),
              order: idx,
            }))

            // Update both days
            await reorderItems(fromDayId, fromPayload)
            await reorderItems(toDayId, toPayload)
          }}
          onItemClick={(item, type) => onEditItem(item, type === "location" ? "location" : "Feature")}
        />
      ) : (
        <List>
          {trip.days?.map((day) => {
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
                    cursor: "pointer",
                    "&:hover": { bgcolor: "action.selected" },
                  }}
                  onClick={() => toggleDay(day.id)}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <IconButton size="small">{expandedDays[day.id] ? <MdExpandLess /> : <MdExpandMore />}</IconButton>
                    <Typography variant="subtitle2">
                      Day {day.day_index + 1} - {new Date(day.date).toLocaleDateString()}
                    </Typography>
                  </Box>
                  <Box>
                    <Button
                      size="small"
                      startIcon={<MdLocationOn />}
                      onClick={(e) => {
                        e.stopPropagation()
                        onAddLocation(day.id, new Date(day.date).toLocaleDateString())
                      }}
                      sx={{ mr: 1 }}
                    >
                      Add Loc
                    </Button>
                    <Button
                      size="small"
                      startIcon={<MdAdd />}
                      onClick={(e) => {
                        e.stopPropagation()
                        onAddFeature(day.id, new Date(day.date).toLocaleDateString())
                      }}
                    >
                      Add Feat
                    </Button>
                  </Box>
                </Box>
                <Collapse in={!!expandedDays[day.id]} timeout="auto" unmountOnExit>
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
                            : (item.properties.description as string) || (item.properties.address as string) || ""

                          // Use saved_id for features to ensure uniqueness
                          const key = isLocation ? item.id : item.saved_id || item.properties.id

                          const endTime = item.end_time || calculateEndTime(item.start_time, item.duration_minutes)

                          const isVisited = item.visited !== undefined ? item.visited : true
                          const isPlanned = item.planned !== undefined ? item.planned : false

                          // Determine color based on type
                          const categoryColor = isLocation
                            ? "grey.400" // Locations get a neutral color
                            : getCategoryColor(
                                (item.properties.type as string) ||
                                  (item.properties.category as string) ||
                                  (item.properties.amenity as string),
                              )

                          // Determine status color for border
                          let statusColor = categoryColor
                          if (isPlanned && !isVisited) statusColor = "primary.main"
                          else if (isVisited) statusColor = "success.main"
                          else statusColor = "text.disabled"

                          const itemColor = categoryColor // Keep itemColor for avatar background

                          // Get thumbnail
                          const thumbnail = !isLocation ? getFeatureThumbnail(item.properties) : null
                          const placeholder = !isLocation
                            ? getCategoryPlaceholder(
                                (item.properties.type as string) ||
                                  (item.properties.category as string) ||
                                  (item.properties.amenity as string),
                              )
                            : null

                          // Calculate distance from previous item
                          let distanceInfo: { distance: number; time: number } | null = null
                          if (idx > 0) {
                            const prevItem = items[idx - 1]
                            const prevLat =
                              prevItem.type === "location" ? prevItem.latitude : prevItem.geometry?.coordinates[1]
                            const prevLng =
                              prevItem.type === "location" ? prevItem.longitude : prevItem.geometry?.coordinates[0]
                            const currLat = isLocation ? item.latitude : item.geometry?.coordinates[1]
                            const currLng = isLocation ? item.longitude : item.geometry?.coordinates[0]

                            if (prevLat && prevLng && currLat && currLng) {
                              const distance = calculateDistance(prevLat, prevLng, currLat, currLng)
                              const time = estimateTravelTime(distance, item.transport_mode)
                              distanceInfo = { distance, time }
                            }
                          }

                          return (
                            <React.Fragment key={key}>
                              {idx > 0 && (
                                <TransportConnector
                                  item={item}
                                  distance={distanceInfo?.distance}
                                  onClick={() => {
                                    setEditingTransportItem(item)
                                    setEditTransportModalOpen(true)
                                  }}
                                />
                              )}
                              <ListItem
                                key={key}
                                sx={{
                                  pl: 0,
                                  borderBottom: idx < items.length - 1 ? 1 : 0,
                                  borderColor: "divider",
                                  flexDirection: "column",
                                  alignItems: "stretch",
                                  borderLeft: 4,
                                  borderLeftColor: statusColor,
                                  ml: 1, // Add margin to offset the border
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
                                        onClick={() => handleToggleVisit(item, day.id)}
                                        color={isVisited ? "success" : "default"}
                                        title={isVisited ? "Mark as not visited" : "Mark as visited"}
                                      >
                                        {isVisited ? <MdCheckBox /> : <MdCheckBoxOutlineBlank />}
                                      </IconButton>
                                      <IconButton
                                        size="small"
                                        onClick={() => onMoveItem(day.id, idx, "up", items)}
                                        disabled={idx === 0}
                                      >
                                        <MdArrowUpward fontSize="small" />
                                      </IconButton>
                                      <IconButton
                                        size="small"
                                        onClick={() => onMoveItem(day.id, idx, "down", items)}
                                        disabled={idx === items.length - 1}
                                      >
                                        <MdArrowDownward fontSize="small" />
                                      </IconButton>
                                    </Box>

                                    {/* Thumbnail or Icon */}
                                    {!isLocation && (
                                      <Avatar
                                        src={thumbnail || placeholder || undefined}
                                        variant="rounded"
                                        sx={{ mr: 2, width: 40, height: 40, bgcolor: itemColor }}
                                      >
                                        {!thumbnail && !placeholder && <MdLocationOn />}
                                      </Avatar>
                                    )}

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
                                            if (item.latitude && item.longitude) onFlyTo(item.latitude, item.longitude)
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
                                        <IconButton size="small" onClick={() => onViewFeature(item as TripFeature)}>
                                          <MdVisibility fontSize="small" />
                                        </IconButton>
                                      </Tooltip>
                                    )}
                                    <Tooltip title="Edit Logistics">
                                      <IconButton
                                        size="small"
                                        onClick={() => {
                                          setEditingTimeItem(item)
                                          setEditTimeModalOpen(true)
                                        }}
                                      >
                                        <MdAccessTime fontSize="small" />
                                      </IconButton>
                                    </Tooltip>
                                    <IconButton size="small" onClick={() => onEditItem(item, item.type)}>
                                      <MdEdit fontSize="small" />
                                    </IconButton>
                                    <IconButton
                                      size="small"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        onDeleteItem(item, day.id)
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
                                      flexDirection: "column",
                                      gap: 0.5,
                                    }}
                                  >
                                    {item.transport_mode && (
                                      <Typography variant="caption" display="block">
                                        <strong>Mode:</strong> {item.transport_mode}
                                      </Typography>
                                    )}
                                    {item.transport_details && (
                                      <Typography variant="caption" display="block">
                                        <strong>Details:</strong> {item.transport_details}
                                      </Typography>
                                    )}
                                    {item.duration_minutes && (
                                      <Typography variant="caption" display="block">
                                        <strong>Duration:</strong> {item.duration_minutes} min
                                      </Typography>
                                    )}
                                  </Box>
                                )}
                              </ListItem>
                            </React.Fragment>
                          )
                        })}
                      </List>
                    )}
                  </Box>
                </Collapse>
              </ListItem>
            )
          })}
        </List>
      )}

      <TripComparisonModal
        open={comparisonModalOpen}
        onClose={() => setComparisonModalOpen(false)}
        trip={trip}
        dayLocations={dayLocations}
        dayFeatures={dayFeatures}
      />

      <EditTimeModal
        open={editTimeModalOpen}
        onClose={() => {
          setEditTimeModalOpen(false)
          setEditingTimeItem(null)
        }}
        item={editingTimeItem}
        onSave={async (updates) => {
          if (!editingTimeItem) return
          const isLocation = "city" in editingTimeItem
          const dayId = editingTimeItem.trip_day_id || ""
          if (isLocation) {
            await updateLocation(editingTimeItem.id, dayId, updates as Partial<DayLocation>)
          } else {
            const savedId = (editingTimeItem as TripFeature).saved_id || (editingTimeItem as TripFeature).properties.id
            await updateFeature(savedId, dayId, updates as Partial<TripFeature>)
          }
        }}
      />

      <EditTransportModal
        open={editTransportModalOpen}
        onClose={() => {
          setEditTransportModalOpen(false)
          setEditingTransportItem(null)
        }}
        item={editingTransportItem}
        onSave={async (updates) => {
          if (!editingTransportItem) return
          const isLocation = "city" in editingTransportItem
          const dayId = editingTransportItem.trip_day_id || ""
          if (isLocation) {
            await updateLocation(editingTransportItem.id, dayId, updates as Partial<DayLocation>)
          } else {
            const savedId =
              (editingTransportItem as TripFeature).saved_id || (editingTransportItem as TripFeature).properties.id
            await updateFeature(savedId, dayId, updates as Partial<TripFeature>)
          }
        }}
      />
    </Box>
  )
}
