import { useState, useEffect } from "react"
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  Slider,
} from "@mui/material"
import type { Trip } from "../types"

type AnimationSettings = {
  speed: number
}

type AnimationStep = {
  activityId: string
  orderIndex: number
  isVisible: boolean
  zoomLevel?: number
  transportMode?: string
}

interface AnimationConfig {
  id?: string
  name: string
  description?: string
  settings: AnimationSettings
  steps: AnimationStep[]
}

interface AnimationConfigDialogProps {
  open: boolean
  onClose: () => void
  trip: Trip
  initialData?: AnimationConfig
  onSubmit: (data: AnimationConfig) => Promise<void>
}

export default function AnimationConfigDialog({
  open,
  onClose,
  trip,
  initialData,
  onSubmit,
}: AnimationConfigDialogProps) {
  const [name, setName] = useState("")
  const [speed, setSpeed] = useState(1)
  const [isLoading, setIsLoading] = useState(false)

  // Initialize form when editing
  useEffect(() => {
    if (initialData) {
      setName(initialData.name || "")
      setSpeed(initialData.settings?.speed || 1)
    } else {
      setName("")
      setSpeed(1)
    }
  }, [initialData, open])

  const handleSubmit = async () => {
    setIsLoading(true)
    try {
      // Basic implementation: Creates an animation with all activities visible
      // In a real implementation we would allow selecting steps.
      const steps =
        trip.activities?.map((activity, index) => ({
          activityId: activity.id,
          orderIndex: index,
          isVisible: true,
          zoomLevel: 15, // Default zoom on arrive
          transportMode: "DRIVING", // Default
        })) || []

      await onSubmit({
        name,
        settings: { speed },
        steps,
      })
      onClose()
    } catch (error) {
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Create New Animation</DialogTitle>
      <DialogContent>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}>
          <TextField label="Animation Name" value={name} onChange={(e) => setName(e.target.value)} fullWidth />

          <Typography gutterBottom>Animation Speed (x)</Typography>
          <Slider
            value={speed}
            onChange={(_, v) => setSpeed(v as number)}
            min={0.5}
            max={5}
            step={0.5}
            marks
            valueLabelDisplay="auto"
          />

          <Typography variant="caption" color="text.secondary">
            This will create an animation sequence including all current activities in order.
          </Typography>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} variant="contained" disabled={isLoading || !name}>
          {isLoading ? "Creating..." : "Create"}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
