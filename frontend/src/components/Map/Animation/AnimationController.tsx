import { PlayArrow, Pause, Stop, Fullscreen, FullscreenExit, Settings as SettingsIcon } from "@mui/icons-material"
import { Box, Paper, Typography, IconButton, LinearProgress, Tooltip } from "@mui/material"

interface AnimationControllerProps {
  isPlaying: boolean
  onPlayPause: () => void
  onReset: () => void
  isFullScreen: boolean
  onToggleFullScreen: () => void
  progress: number
  t: (key: any) => string
  onOpenSettings?: () => void
  visible?: boolean
}

export const AnimationController = ({
  isPlaying,
  onPlayPause,
  onReset,
  isFullScreen,
  onToggleFullScreen,
  progress,
  t,
  onOpenSettings,
  visible = true,
}: AnimationControllerProps) => {
  return (
    <Box
      sx={{
        position: "absolute",
        bottom: isFullScreen ? 30 : 24,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 1001,
        width: "90%",
        maxWidth: 600,
        opacity: visible ? 1 : 0,
        transition: "opacity 0.5s ease-in-out",
        pointerEvents: visible ? "auto" : "none",
      }}
    >
      <Paper
        elevation={6}
        sx={{
          p: 2,
          display: "flex",
          flexDirection: "column",
          gap: 1.5,
          borderRadius: 3,
          backgroundColor: "rgba(255, 255, 255, 0.95)",
          backdropFilter: "blur(4px)",
        }}
      >
        <Box display="flex" alignItems="center" gap={1}>
          <Tooltip title={isPlaying ? t("pause") : t("play")}>
            <IconButton onClick={onPlayPause} color="primary" size="large">
              {isPlaying ? <Pause fontSize="large" /> : <PlayArrow fontSize="large" />}
            </IconButton>
          </Tooltip>

          <Tooltip title={t("stop")}>
            <IconButton onClick={onReset} color="error">
              <Stop />
            </IconButton>
          </Tooltip>

          <Box sx={{ flexGrow: 1, mx: 2 }}>
            <Box display="flex" justifyContent="space-between" mb={0.5}>
              <Typography variant="caption" color="text.secondary" fontWeight="medium">
                {t("animationProgress")}
              </Typography>
              <Typography variant="caption" color="primary" fontWeight="bold">
                {Math.round(progress * 100)}%
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={progress * 100}
              sx={{
                height: 8,
                borderRadius: 4,
                backgroundColor: "rgba(0, 0, 0, 0.05)",
                "& .MuiLinearProgress-bar": {
                  borderRadius: 4,
                },
              }}
            />
          </Box>

          {!isFullScreen && (
            <Tooltip title={t("settings")}>
              <IconButton onClick={onOpenSettings}>
                <SettingsIcon />
              </IconButton>
            </Tooltip>
          )}

          <Tooltip title={isFullScreen ? t("exitFullscreen") : t("fullscreen")}>
            <IconButton onClick={onToggleFullScreen}>{isFullScreen ? <FullscreenExit /> : <Fullscreen />}</IconButton>
          </Tooltip>
        </Box>
      </Paper>
    </Box>
  )
}
