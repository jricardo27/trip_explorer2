import { Paper, IconButton, Tooltip, Box, Slider, Typography } from "@mui/material"
import React from "react"
import { MdPlayArrow, MdPause, MdReplay, MdSettings } from "react-icons/md"

interface TripAnimationControlProps {
  isPlaying: boolean
  onPlayPause: () => void
  onReset: () => void
  progress: number
  onSeek: (value: number) => void
  speed: number
  onSpeedChange: (value: number) => void
  onOpenSettings: () => void
}

export const TripAnimationControl: React.FC<TripAnimationControlProps> = ({
  isPlaying,
  onPlayPause,
  onReset,
  progress,
  onSeek,
  speed,
  onSpeedChange,
  onOpenSettings,
}) => {
  return (
    <Box
      sx={{
        position: "absolute",
        bottom: 30,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 1000,
        width: "90%",
        maxWidth: 400,
      }}
    >
      <Paper
        elevation={3}
        sx={{
          p: 2,
          display: "flex",
          flexDirection: "column",
          gap: 1,
          bgcolor: "background.paper",
          borderRadius: 2,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <Tooltip title={isPlaying ? "Pause" : "Play"}>
            <IconButton onClick={onPlayPause} color="primary" size="large">
              {isPlaying ? <MdPause /> : <MdPlayArrow />}
            </IconButton>
          </Tooltip>

          <Tooltip title="Reset">
            <IconButton onClick={onReset} size="medium">
              <MdReplay />
            </IconButton>
          </Tooltip>

          <Box sx={{ flexGrow: 1, mx: 2 }}>
            <Slider
              value={progress}
              min={0}
              max={100}
              onChange={(_, value) => onSeek(value as number)}
              aria-label="Animation Progress"
              size="small"
            />
          </Box>

          <Tooltip title="Settings">
            <IconButton onClick={onOpenSettings} size="medium">
              <MdSettings />
            </IconButton>
          </Tooltip>
        </Box>

        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", px: 1 }}>
          <Typography variant="caption" color="text.secondary">
            Speed: {speed}x
          </Typography>
          <Slider
            value={speed}
            min={0.5}
            max={5}
            step={0.5}
            onChange={(_, value) => onSpeedChange(value as number)}
            sx={{ width: 100 }}
            size="small"
          />
        </Box>
      </Paper>
    </Box>
  )
}
