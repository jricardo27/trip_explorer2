import { useDroppable } from "@dnd-kit/core"
import { Box, Typography, Paper, Stack, IconButton, TextField, Collapse, Button, Chip } from "@mui/material"
import React, { useMemo, useState } from "react"
import {
  MdEdit,
  MdCheck,
  MdExpandMore,
  MdExpandLess,
  MdDirectionsCar,
  MdDirectionsBus,
  MdDirectionsWalk,
  MdDirectionsBike,
  MdTrain,
  MdFlight,
  MdAdd,
} from "react-icons/md"

import { TripDay, DayLocation, TripFeature, useTripContext } from "../../contexts/TripContext"

import ActivityCard from "./ActivityCard"

interface DaySectionProps {
  day: TripDay
  locations: DayLocation[]
  features: TripFeature[]
  onEditItem?: (item: DayLocation | TripFeature) => void
  onDeleteItem?: (item: DayLocation | TripFeature, dayId: string) => void
  onTransportClick?: (item: DayLocation | TripFeature) => void
}

const DaySection: React.FC<DaySectionProps> = ({
  day,
  locations,
  features,
  onEditItem,
  onDeleteItem,
  onTransportClick,
}) => {
  const { updateDay, updateLocation, updateFeature } = useTripContext()
  const [isEditingName, setIsEditingName] = useState(false)
  const [dayName, setDayName] = useState(day.name || "")
  const [isEditingNotes, setIsEditingNotes] = useState(false)
  const [dayNotes, setDayNotes] = useState(day.notes || "")
  const [isExpanded, setIsExpanded] = useState(true)

  const { setNodeRef } = useDroppable({
    id: day.id,
    data: { type: "Day", day },
  })

  const items = useMemo(() => {
    const combined = [
      ...locations.map((l) => ({ ...l, type: "location" as const })),
      ...features.map((f) => ({ ...f, type: "Feature" as const })),
    ]
    return combined.sort((a, b) => (a.visit_order || 0) - (b.visit_order || 0))
  }, [locations, features])

  const handleSaveName = async () => {
    await updateDay(day.id, { name: dayName })
    setIsEditingName(false)
  }

  const handleSaveNotes = async () => {
    await updateDay(day.id, { notes: dayNotes })
    setIsEditingNotes(false)
  }

  const getTransportIcon = (mode: string) => {
    switch (mode) {
      case "car":
        return <MdDirectionsCar />
      case "bus":
        return <MdDirectionsBus />
      case "walk":
        return <MdDirectionsWalk />
      case "bike":
        return <MdDirectionsBike />
      case "train":
        return <MdTrain />
      case "flight":
        return <MdFlight />
      default:
        return <MdDirectionsCar />
    }
  }

  const formattedDate = useMemo(() => {
    if (!day.date) return "Invalid Date"
    const date = new Date(day.date)
    if (isNaN(date.getTime())) return "Invalid Date"
    return date.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })
  }, [day.date])

  return (
    <Box ref={setNodeRef}>
      <Box sx={{ mb: 2, position: "sticky", top: 0, bgcolor: "background.default", zIndex: 1, py: 1 }}>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Box sx={{ flexGrow: 1 }}>
            {isEditingName ? (
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <TextField
                  size="small"
                  value={dayName}
                  onChange={(e) => setDayName(e.target.value)}
                  placeholder="Day name (optional)"
                  autoFocus
                  onKeyPress={(e) => e.key === "Enter" && handleSaveName()}
                />
                <IconButton size="small" onClick={handleSaveName}>
                  <MdCheck />
                </IconButton>
              </Box>
            ) : (
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Typography variant="h6" fontWeight="bold">
                  Day {day.day_index + 1}
                  {dayName && `: ${dayName}`}
                </Typography>
                <IconButton size="small" onClick={() => setIsEditingName(true)}>
                  <MdEdit fontSize="small" />
                </IconButton>
              </Box>
            )}
            <Typography variant="body2" color="text.secondary">
              {formattedDate}
            </Typography>
          </Box>
          <IconButton onClick={() => setIsExpanded(!isExpanded)}>
            {isExpanded ? <MdExpandLess /> : <MdExpandMore />}
          </IconButton>
        </Box>

        {/* Day Notes */}
        {isEditingNotes ? (
          <Box sx={{ mt: 1, display: "flex", alignItems: "flex-start", gap: 1 }}>
            <TextField
              size="small"
              multiline
              rows={2}
              fullWidth
              value={dayNotes}
              onChange={(e) => setDayNotes(e.target.value)}
              placeholder="Add notes for this day..."
              autoFocus
            />
            <IconButton size="small" onClick={handleSaveNotes}>
              <MdCheck />
            </IconButton>
          </Box>
        ) : dayNotes ? (
          <Box
            sx={{ mt: 1, cursor: "pointer", "&:hover": { bgcolor: "action.hover" }, p: 1, borderRadius: 1 }}
            onClick={() => setIsEditingNotes(true)}
          >
            <Typography variant="body2" color="text.secondary">
              {dayNotes}
            </Typography>
          </Box>
        ) : (
          <Box
            sx={{ mt: 1, cursor: "pointer", "&:hover": { bgcolor: "action.hover" }, p: 1, borderRadius: 1 }}
            onClick={() => setIsEditingNotes(true)}
          >
            <Typography variant="body2" color="text.disabled" fontStyle="italic">
              Add notes...
            </Typography>
          </Box>
        )}
      </Box>

      <Collapse in={isExpanded}>
        <Stack spacing={0}>
          {items.map((item, index) => {
            const isLocation = "city" in item
            const itemId = isLocation
              ? (item as DayLocation).id
              : (item as TripFeature).saved_id || (item as TripFeature).properties.id

            return (
              <React.Fragment key={itemId}>
                {/* Transport Connector (only before items, but not before the first one if we want it strictly between) 
                                    Actually, usually transport is "to this location". 
                                    So we render it before the item, except maybe the first item of the day if it's the start?
                                    Let's render it before every item except the first one for now, or allow it for all if it represents travel TO this spot.
                                */}
                {index > 0 && (
                  <Box sx={{ display: "flex", justifyContent: "center", my: 0.5, position: "relative" }}>
                    {/* Vertical Line */}
                    <Box
                      sx={{
                        position: "absolute",
                        top: -8,
                        bottom: -8,
                        left: "50%",
                        borderLeft: "2px dashed",
                        borderColor: "divider",
                        zIndex: 0,
                      }}
                    />

                    {item.transport_mode ? (
                      <Chip
                        icon={getTransportIcon(item.transport_mode)}
                        label={item.transport_mode}
                        size="small"
                        onClick={() => onTransportClick?.(item)}
                        onDelete={async () => {
                          if (isLocation) {
                            await updateLocation(itemId, day.id, {
                              transport_mode: null,
                            } as unknown as Partial<DayLocation>)
                          } else {
                            await updateFeature(itemId, day.id, {
                              transport_mode: null,
                            } as unknown as Partial<TripFeature>)
                          }
                        }}
                        sx={{
                          zIndex: 1,
                          bgcolor: "background.paper",
                          border: 1,
                          borderColor: "divider",
                          textTransform: "capitalize",
                          cursor: "pointer",
                        }}
                      />
                    ) : (
                      <Button
                        size="small"
                        startIcon={<MdAdd size={14} />}
                        onClick={() => onTransportClick?.(item)}
                        sx={{
                          zIndex: 1,
                          bgcolor: "background.paper",
                          minWidth: 0,
                          px: 1,
                          py: 0.2,
                          fontSize: "0.7rem",
                          color: "text.secondary",
                          "&:hover": { bgcolor: "action.hover", color: "primary.main" },
                        }}
                      >
                        Add Transport
                      </Button>
                    )}
                  </Box>
                )}

                <ActivityCard
                  item={item}
                  onEdit={() => onEditItem?.(item)}
                  onDelete={() => onDeleteItem?.(item, day.id)}
                />
              </React.Fragment>
            )
          })}

          {/* Placeholder for empty day */}
          {items.length === 0 && (
            <Paper
              sx={{ p: 2, bgcolor: "action.hover", borderStyle: "dashed", borderWidth: 2, borderColor: "divider" }}
            >
              <Typography variant="body2" color="text.secondary" align="center">
                Drag activities here
              </Typography>
            </Paper>
          )}
        </Stack>
      </Collapse>
    </Box>
  )
}

export default DaySection
