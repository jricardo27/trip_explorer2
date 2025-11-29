import { Box, Typography, Button, List, ListItem, ListItemText, IconButton, Tooltip, Collapse } from "@mui/material"
import React, { useState } from "react"
import { FaDownload } from "react-icons/fa"
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
} from "react-icons/md"

import { Trip, DayLocation, TripFeature } from "../../../contexts/TripContext"
import { calculateDistance, formatDistance, estimateTravelTime, formatTravelTime } from "../../../utils/distanceUtils"
import { calculateEndTime } from "../../../utils/timeUtils"
import { exportTripToGeoJSON, exportTripToKML } from "../../TopMenu/exportTrip"
import { exportTripToExcel } from "../../TopMenu/exportTripToExcel"
import { TripSummary } from "../../Trips/TripSummary"

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
}) => {
  // State to track which days are expanded (all expanded by default)
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set(trip.days?.map((d) => d.id) || []))

  const toggleDay = (dayId: string) => {
    setExpandedDays((prev) => {
      const next = new Set(prev)
      if (next.has(dayId)) {
        next.delete(dayId)
      } else {
        next.add(dayId)
      }
      return next
    })
  }

  const expandAll = () => {
    setExpandedDays(new Set(trip.days?.map((d) => d.id) || []))
  }

  const collapseAll = () => {
    setExpandedDays(new Set())
  }

  const handleExport = (format: string) => {
    const exportData = {
      trip,
      locations: dayLocations,
      features: dayFeatures,
    }
    if (format === "geojson") exportTripToGeoJSON(exportData)
    else if (format === "kml") exportTripToKML(exportData)
    else if (format === "excel") exportTripToExcel(exportData)
  }

  return (
    <Box sx={{ flexGrow: 1, overflowY: "auto", p: 2 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
        <Button startIcon={<MdArrowBack />} onClick={onBack}>
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

            menu.querySelectorAll(".export-option").forEach((opt) => {
              opt.addEventListener("mouseenter", () => {
                ;(opt as HTMLElement).style.background = "#f5f5f5"
              })
              opt.addEventListener("mouseleave", () => {
                ;(opt as HTMLElement).style.background = "white"
              })
              opt.addEventListener("click", () => {
                handleExport(opt.getAttribute("data-format")!)
                document.body.removeChild(menu)
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
      <Typography variant="h5" gutterBottom>
        {trip.name}
      </Typography>
      <Typography variant="body2" color="text.secondary" gutterBottom>
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
                  <IconButton size="small">{expandedDays.has(day.id) ? <MdExpandLess /> : <MdExpandMore />}</IconButton>
                  <Typography variant="subtitle2">
                    Day {day.day_index + 1} - {new Date(day.date).toLocaleDateString()}
                  </Typography>
                </Box>
                <Box>
                  <Button
                    size="small"
                    startIcon={<MdLocationOn />}
                    onClick={() => onAddLocation(day.id, new Date(day.date).toLocaleDateString())}
                    sx={{ mr: 1 }}
                  >
                    Add Loc
                  </Button>
                  <Button
                    size="small"
                    startIcon={<MdAdd />}
                    onClick={() => onAddFeature(day.id, new Date(day.date).toLocaleDateString())}
                  >
                    Add Feat
                  </Button>
                </Box>
              </Box>
              <Collapse in={expandedDays.has(day.id)} timeout="auto" unmountOnExit>
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
                            {distanceInfo && (
                              <Box
                                sx={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 1,
                                  py: 0.5,
                                  px: 2,
                                  bgcolor: "action.hover",
                                  fontSize: "0.75rem",
                                  color: "text.secondary",
                                }}
                              >
                                <Typography variant="caption" sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                                  ↓ {formatDistance(distanceInfo.distance)}
                                  {item.transport_mode && (
                                    <>
                                      {" "}
                                      (~{formatTravelTime(distanceInfo.time)} by {item.transport_mode})
                                    </>
                                  )}
                                </Typography>
                              </Box>
                            )}
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
    </Box>
  )
}
