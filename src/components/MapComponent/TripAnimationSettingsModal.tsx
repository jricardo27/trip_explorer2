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
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from "@mui/material"
import React, { useState, useEffect } from "react"
import { MdExpandMore } from "react-icons/md"

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
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Animation Settings</DialogTitle>
      <DialogContent>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}>
          {/* Basic Settings */}
          <Typography variant="h6" sx={{ mt: 1 }}>
            Basic Settings
          </Typography>
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
                checked={localConfig.showNamesOnActiveOnly ?? false}
                onChange={(e) => handleChange("showNamesOnActiveOnly", e.target.checked)}
              />
            }
            label="Show Names on Active Nodes Only"
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
              max={10}
              step={1}
              onChange={(_, value) => handleChange("pauseOnArrival", value as number)}
              valueLabelDisplay="auto"
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

          {/* Advanced Zoom Settings */}
          <Accordion>
            <AccordionSummary expandIcon={<MdExpandMore />}>
              <Typography>Zoom Settings</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <Box>
                  <Typography gutterBottom>Zoom Level (default: 14)</Typography>
                  <Slider
                    value={localConfig.zoomLevel ?? 14}
                    min={8}
                    max={18}
                    step={1}
                    onChange={(_, value) => handleChange("zoomLevel", value as number)}
                    valueLabelDisplay="auto"
                    marks={[
                      { value: 8, label: "8" },
                      { value: 14, label: "14" },
                      { value: 18, label: "18" },
                    ]}
                  />
                </Box>
                <Box>
                  <Typography gutterBottom>Zoom Padding (pixels, default: 100)</Typography>
                  <Slider
                    value={localConfig.zoomPadding ?? 100}
                    min={20}
                    max={200}
                    step={10}
                    onChange={(_, value) => handleChange("zoomPadding", value as number)}
                    valueLabelDisplay="auto"
                  />
                </Box>
                <Box>
                  <Typography gutterBottom>End Zoom Padding (pixels, default: 50)</Typography>
                  <Slider
                    value={localConfig.endZoomPadding ?? 50}
                    min={20}
                    max={200}
                    step={10}
                    onChange={(_, value) => handleChange("endZoomPadding", value as number)}
                    valueLabelDisplay="auto"
                  />
                </Box>
                <Box>
                  <Typography gutterBottom>Zoom to Start Duration (seconds, default: 1)</Typography>
                  <Slider
                    value={localConfig.zoomToStartDuration ?? 1}
                    min={0.5}
                    max={5}
                    step={0.5}
                    onChange={(_, value) => handleChange("zoomToStartDuration", value as number)}
                    valueLabelDisplay="auto"
                  />
                </Box>
                <Box>
                  <Typography gutterBottom>Zoom Out to Both Duration (seconds, default: 2)</Typography>
                  <Slider
                    value={localConfig.zoomOutToBothDuration ?? 2}
                    min={0.5}
                    max={5}
                    step={0.5}
                    onChange={(_, value) => handleChange("zoomOutToBothDuration", value as number)}
                    valueLabelDisplay="auto"
                  />
                </Box>
                <Box>
                  <Typography gutterBottom>Zoom to Destination Duration (seconds, default: 3)</Typography>
                  <Slider
                    value={localConfig.zoomToDestDuration ?? 3}
                    min={0.5}
                    max={10}
                    step={0.5}
                    onChange={(_, value) => handleChange("zoomToDestDuration", value as number)}
                    valueLabelDisplay="auto"
                  />
                </Box>
                <Box>
                  <Typography gutterBottom>End Zoom Duration (seconds, default: 3)</Typography>
                  <Slider
                    value={localConfig.endZoomDuration ?? 3}
                    min={0.5}
                    max={10}
                    step={0.5}
                    onChange={(_, value) => handleChange("endZoomDuration", value as number)}
                    valueLabelDisplay="auto"
                  />
                </Box>
              </Box>
            </AccordionDetails>
          </Accordion>

          {/* Speed & Timing Settings */}
          <Accordion>
            <AccordionSummary expandIcon={<MdExpandMore />}>
              <Typography>Speed & Timing</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <Box>
                  <Typography gutterBottom>Base Speed Multiplier (default: 500000)</Typography>
                  <Slider
                    value={localConfig.baseSpeedMultiplier ?? 500000}
                    min={100000}
                    max={1000000}
                    step={50000}
                    onChange={(_, value) => handleChange("baseSpeedMultiplier", value as number)}
                    valueLabelDisplay="auto"
                  />
                </Box>
                <Box>
                  <Typography gutterBottom>Minimum Segment Duration (seconds, default: 3)</Typography>
                  <Slider
                    value={localConfig.minSegmentDuration ?? 3}
                    min={1}
                    max={10}
                    step={0.5}
                    onChange={(_, value) => handleChange("minSegmentDuration", value as number)}
                    valueLabelDisplay="auto"
                  />
                </Box>
                <Box>
                  <Typography gutterBottom>Maximum Segment Duration (seconds, default: 10)</Typography>
                  <Slider
                    value={localConfig.maxSegmentDuration ?? 10}
                    min={5}
                    max={120}
                    step={5}
                    onChange={(_, value) => handleChange("maxSegmentDuration", value as number)}
                    valueLabelDisplay="auto"
                  />
                </Box>
                <Box>
                  <Typography gutterBottom>Slowdown Start (%, default: 80)</Typography>
                  <Slider
                    value={(localConfig.slowdownStartThreshold ?? 0.8) * 100}
                    min={50}
                    max={95}
                    step={5}
                    onChange={(_, value) => handleChange("slowdownStartThreshold", (value as number) / 100)}
                    valueLabelDisplay="auto"
                    valueLabelFormat={(value) => `${value}%`}
                  />
                </Box>
                <Box>
                  <Typography gutterBottom>Slowdown Intensity (%, default: 70)</Typography>
                  <Slider
                    value={(localConfig.slowdownIntensity ?? 0.7) * 100}
                    min={0}
                    max={100}
                    step={5}
                    onChange={(_, value) => handleChange("slowdownIntensity", (value as number) / 100)}
                    valueLabelDisplay="auto"
                    valueLabelFormat={(value) => `${value}%`}
                  />
                </Box>
              </Box>
            </AccordionDetails>
          </Accordion>

          {/* End Animation Behavior */}
          <Accordion>
            <AccordionSummary expandIcon={<MdExpandMore />}>
              <Typography>End Animation Behavior</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={localConfig.zoomOutAtEnd ?? true}
                      onChange={(e) => handleChange("zoomOutAtEnd", e.target.checked)}
                    />
                  }
                  label={localConfig.zoomOutAtEnd ? "Zoom Out to Full Trip" : "Stop at Destination"}
                />

                {localConfig.zoomOutAtEnd && (
                  <>
                    <Box>
                      <Typography gutterBottom>Delay before Zoom Out (seconds)</Typography>
                      <Slider
                        value={localConfig.endAnimationDelay ?? 0}
                        min={0}
                        max={10}
                        step={0.5}
                        onChange={(_, value) => handleChange("endAnimationDelay", value as number)}
                        valueLabelDisplay="auto"
                      />
                    </Box>
                    <Box>
                      <Typography gutterBottom>Zoom Out Duration (seconds)</Typography>
                      <Slider
                        value={localConfig.endZoomDuration ?? 3}
                        min={0.5}
                        max={10}
                        step={0.5}
                        onChange={(_, value) => handleChange("endZoomDuration", value as number)}
                        valueLabelDisplay="auto"
                      />
                    </Box>
                    <Box>
                      <Typography gutterBottom>End Zoom Padding (pixels)</Typography>
                      <Slider
                        value={localConfig.endZoomPadding ?? 50}
                        min={20}
                        max={200}
                        step={10}
                        onChange={(_, value) => handleChange("endZoomPadding", value as number)}
                        valueLabelDisplay="auto"
                      />
                    </Box>
                  </>
                )}
              </Box>
            </AccordionDetails>
          </Accordion>

          {/* Phase Transition Settings */}
          <Accordion>
            <AccordionSummary expandIcon={<MdExpandMore />}>
              <Typography>Phase Transitions (Advanced)</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <Box>
                  <Typography gutterBottom>Zoom Out Phase End (%, default: 33)</Typography>
                  <Slider
                    value={(localConfig.zoomOutPhaseEnd ?? 0.33) * 100}
                    min={10}
                    max={50}
                    step={5}
                    onChange={(_, value) => handleChange("zoomOutPhaseEnd", (value as number) / 100)}
                    valueLabelDisplay="auto"
                    valueLabelFormat={(value) => `${value}%`}
                  />
                </Box>
                <Box>
                  <Typography gutterBottom>Maintain Phase End (%, default: 66)</Typography>
                  <Slider
                    value={(localConfig.maintainPhaseEnd ?? 0.66) * 100}
                    min={50}
                    max={90}
                    step={5}
                    onChange={(_, value) => handleChange("maintainPhaseEnd", (value as number) / 100)}
                    valueLabelDisplay="auto"
                    valueLabelFormat={(value) => `${value}%`}
                  />
                </Box>
              </Box>
            </AccordionDetails>
          </Accordion>
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
