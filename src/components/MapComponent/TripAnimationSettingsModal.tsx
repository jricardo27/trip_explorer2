import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControlLabel,
  Switch,
  Typography,
  Box,
  Slider,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from "@mui/material"
import React, { useState, useEffect } from "react"

import { TRAVEL_ICON_OPTIONS } from "../../constants/travelIcons"
import { AnimationConfig } from "../../contexts/TripContext"

interface TripAnimationSettingsModalProps {
  open: boolean
  onClose: () => void
  config: AnimationConfig
  onSave: (config: AnimationConfig) => void
}

export const TripAnimationSettingsModal: React.FC<TripAnimationSettingsModalProps> = ({
  open,
  onClose,
  config,
  onSave,
}) => {
  const [localConfig, setLocalConfig] = useState<AnimationConfig>(config)

  useEffect(() => {
    setLocalConfig(config)
  }, [config, open])

  const handleChange = (key: keyof AnimationConfig, value: boolean | number | string) => {
    setLocalConfig((prev) => ({ ...prev, [key]: value }))
  }

  const handleSave = () => {
    onSave(localConfig)
    onClose()
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Animation Settings</DialogTitle>
      <DialogContent>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}>
          <FormControlLabel
            control={
              <Switch
                checked={localConfig.showName ?? true}
                onChange={(e) => handleChange("showName", e.target.checked)}
              />
            }
            label="Always Show Name"
          />
          <FormControlLabel
            control={
              <Switch
                checked={localConfig.showOnArrival ?? true}
                onChange={(e) => handleChange("showOnArrival", e.target.checked)}
              />
            }
            label="Show Name on Arrival"
          />
          <FormControlLabel
            control={
              <Switch
                checked={localConfig.zoomOnApproach ?? false}
                onChange={(e) => handleChange("zoomOnApproach", e.target.checked)}
              />
            }
            label="Zoom on Approach"
          />
          <FormControlLabel
            control={
              <Switch
                checked={localConfig.zoomAtStart ?? true}
                onChange={(e) => handleChange("zoomAtStart", e.target.checked)}
              />
            }
            label="Zoom In at Start"
          />
          <FormControlLabel
            control={
              <Switch
                checked={localConfig.zoomOutAtEnd ?? true}
                onChange={(e) => handleChange("zoomOutAtEnd", e.target.checked)}
              />
            }
            label="Zoom Out at End"
          />
          <Box>
            <Typography gutterBottom>Default Speed</Typography>
            <Slider
              value={localConfig.speed ?? 1}
              min={0.5}
              max={3}
              step={0.5}
              onChange={(_, value) => handleChange("speed", value as number)}
              valueLabelDisplay="auto"
            />
          </Box>
          <Box>
            <Typography gutterBottom>Pause on Arrival (seconds)</Typography>
            <Slider
              value={localConfig.pauseOnArrival ?? 6}
              min={0}
              max={5}
              step={1}
              onChange={(_, value) => handleChange("pauseOnArrival", value as number)}
              valueLabelDisplay="auto"
              marks={[
                { value: 0, label: "0s" },
                { value: 1, label: "1s" },
                { value: 3, label: "3s" },
                { value: 5, label: "5s" },
              ]}
            />
          </Box>
          <FormControl fullWidth>
            <InputLabel>Default Travel Icon</InputLabel>
            <Select
              value={localConfig.defaultTravelIcon || "person"}
              label="Default Travel Icon"
              onChange={(e) => handleChange("defaultTravelIcon", e.target.value)}
            >
              {TRAVEL_ICON_OPTIONS.map((option) => (
                <MenuItem key={option.id} value={option.id}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave} variant="contained">
          Save
        </Button>
      </DialogActions>
    </Dialog>
  )
}
