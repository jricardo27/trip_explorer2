import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
  Typography,
  Divider,
  FormControlLabel,
  Switch,
} from "@mui/material"
import React, { useState, useEffect } from "react"

import { TRANSPORT_MODES } from "../../constants/transportModes"
import { TRAVEL_ICON_OPTIONS } from "../../constants/travelIcons"
import { DayLocation, TripFeature, AnimationConfig } from "../../contexts/TripContext"

interface EditItemModalProps {
  open: boolean
  onClose: () => void
  onSave: (id: string, updates: Partial<TripFeature | DayLocation>) => void
  item: DayLocation | TripFeature | null
  type: "location" | "feature"
  globalAnimationConfig?: AnimationConfig
}

export const EditItemModal: React.FC<EditItemModalProps> = ({
  open,
  onClose,
  onSave,
  item,
  type,
  globalAnimationConfig = {},
}) => {
  const [notes, setNotes] = useState("")
  const [transportMode, setTransportMode] = useState("")
  const [transportDetails, setTransportDetails] = useState("")
  const [transportCost, setTransportCost] = useState("")
  const [durationMinutes, setDurationMinutes] = useState("")
  const [startTime, setStartTime] = useState("")
  const [endTime, setEndTime] = useState("")

  // Animation config state
  const [showName, setShowName] = useState<boolean | undefined>(undefined)
  const [showOnArrival, setShowOnArrival] = useState<boolean | undefined>(undefined)
  const [zoomOnApproach, setZoomOnApproach] = useState<boolean | undefined>(undefined)
  const [defaultTravelIcon, setDefaultTravelIcon] = useState<string | undefined>(undefined)

  useEffect(() => {
    if (item) {
      if (type === "location") {
        const loc = item as DayLocation
        setNotes(loc.notes || "")
      } else {
        setNotes("")
      }

      setTransportMode(item.transport_mode || "")
      setTransportDetails(item.transport_details || "")
      setTransportCost(item.transport_cost?.toString() || "")
      setDurationMinutes(item.duration_minutes?.toString() || "")
      setStartTime(item.start_time || "")
      setEndTime(item.end_time || "")

      // Load animation config
      const config = item.animation_config || {}
      setShowName(config.showName)
      setShowOnArrival(config.showOnArrival)
      setZoomOnApproach(config.zoomOnApproach)
      setDefaultTravelIcon(config.defaultTravelIcon)
    }
  }, [item, type])

  const handleSubmit = () => {
    if (!item) return

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updates: any = {
      transport_mode: transportMode.trim() || null,
      transport_details: transportDetails.trim() || null,
      transport_cost: transportCost ? parseFloat(transportCost) : null,
      duration_minutes: durationMinutes ? parseInt(durationMinutes) : null,
      start_time: startTime || null,
      end_time: endTime || null,
      animation_config: {
        showName,
        showOnArrival,
        zoomOnApproach,
        defaultTravelIcon,
      },
    }

    if (type === "location") {
      updates.notes = notes.trim() || null
    }

    const itemId = type === "feature" ? (item as TripFeature).properties.id : (item as DayLocation).id
    onSave(itemId, updates)
    onClose()
  }

  const getEffectiveValue = (
    itemValue: boolean | undefined,
    globalValue: boolean | undefined,
    defaultValue: boolean,
  ) => {
    return itemValue !== undefined ? itemValue : globalValue !== undefined ? globalValue : defaultValue
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Edit Details</DialogTitle>
      <DialogContent>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 3, mt: 1 }}>
          <Box sx={{ display: "flex", gap: 2 }}>
            <FormControl fullWidth>
              <InputLabel>Transport Mode</InputLabel>
              <Select value={transportMode} label="Transport Mode" onChange={(e) => setTransportMode(e.target.value)}>
                <MenuItem value="">
                  <em>None</em>
                </MenuItem>
                {TRANSPORT_MODES.map((mode) => (
                  <MenuItem key={mode.id} value={mode.id}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <mode.icon />
                      {mode.label}
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="Duration (mins)"
              type="number"
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(e.target.value)}
              fullWidth
            />
          </Box>

          <Box sx={{ display: "flex", gap: 2 }}>
            <TextField
              label="Transport Details"
              value={transportDetails}
              onChange={(e) => setTransportDetails(e.target.value)}
              placeholder="e.g., Flight AA123"
              fullWidth
            />
            <TextField
              label="Cost"
              type="number"
              value={transportCost}
              onChange={(e) => setTransportCost(e.target.value)}
              fullWidth
            />
          </Box>

          <Box sx={{ display: "flex", gap: 2 }}>
            <TextField
              label="Start Time"
              type="time"
              InputLabelProps={{ shrink: true }}
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              fullWidth
            />
            <TextField
              label="End Time"
              type="time"
              InputLabelProps={{ shrink: true }}
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              fullWidth
            />
          </Box>

          {type === "location" && (
            <TextField
              label="Notes"
              multiline
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              fullWidth
            />
          )}

          <Divider />

          <Box>
            <Typography variant="subtitle2" gutterBottom>
              Animation Settings (Override Global)
            </Typography>
            <Typography variant="caption" color="text.secondary" gutterBottom display="block">
              Leave unchecked to use global trip settings
            </Typography>

            <Box sx={{ display: "flex", flexDirection: "column", gap: 1, mt: 2 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={getEffectiveValue(showName, globalAnimationConfig.showName, true)}
                    onChange={(e) => setShowName(e.target.checked)}
                  />
                }
                label={`Always Show Name ${showName === undefined ? "(using global)" : ""}`}
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={getEffectiveValue(showOnArrival, globalAnimationConfig.showOnArrival, true)}
                    onChange={(e) => setShowOnArrival(e.target.checked)}
                  />
                }
                label={`Show on Arrival ${showOnArrival === undefined ? "(using global)" : ""}`}
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={getEffectiveValue(zoomOnApproach, globalAnimationConfig.zoomOnApproach, false)}
                    onChange={(e) => setZoomOnApproach(e.target.checked)}
                  />
                }
                label={`Zoom on Approach ${zoomOnApproach === undefined ? "(using global)" : ""}`}
              />

              <FormControl fullWidth sx={{ mt: 1 }}>
                <InputLabel>Travel Icon Override</InputLabel>
                <Select
                  value={defaultTravelIcon || ""}
                  label="Travel Icon Override"
                  onChange={(e) => setDefaultTravelIcon(e.target.value || undefined)}
                >
                  <MenuItem value="">
                    <em>Use Global ({globalAnimationConfig.defaultTravelIcon || "person"})</em>
                  </MenuItem>
                  {TRAVEL_ICON_OPTIONS.map((option) => (
                    <MenuItem key={option.id} value={option.id}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
          </Box>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} variant="contained">
          Save
        </Button>
      </DialogActions>
    </Dialog>
  )
}
