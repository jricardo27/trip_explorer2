import { Settings as SettingsIcon, Close, Info as InfoIcon } from "@mui/icons-material"
import {
  Box,
  Typography,
  IconButton,
  Drawer,
  Slider,
  Divider,
  TextField,
  Button,
  CircularProgress,
  Tooltip,
  Select,
  MenuItem,
} from "@mui/material"

import type { TripAnimation } from "../../../types"

interface AnimationSettingsSidebarProps {
  settings: {
    name: string
    transitionDuration: number
    stayDuration: number
    speedFactor: number
  }
  onChange: (key: string, value: any) => void
  isOpen: boolean
  onToggle: () => void
  t: (key: any) => string
  animations?: TripAnimation[]
  onSave: () => void
  onDelete: () => void
  onSelectAnimation: (id: string) => void
  currentAnimationId?: string
  isSaving?: boolean
}

export const AnimationSettingsSidebar = ({
  settings,
  onChange,
  isOpen,
  onToggle,
  t,
  animations = [],
  onSave,
  onDelete,
  onSelectAnimation,
  currentAnimationId,
  isSaving = false,
}: AnimationSettingsSidebarProps) => (
  <>
    <IconButton
      onClick={onToggle}
      sx={{
        position: "absolute",
        top: 80,
        right: 12,
        zIndex: 1000,
        bgcolor: "white",
        boxShadow: 2,
        "&:hover": { bgcolor: "grey.100" },
      }}
    >
      <SettingsIcon />
    </IconButton>

    <Drawer
      anchor="right"
      open={isOpen}
      onClose={onToggle}
      PaperProps={{
        sx: { width: 320, p: 3 },
      }}
    >
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h6">{t("animationSettings") || "Ajustes de Animación"}</Typography>
        <IconButton onClick={onToggle} size="small">
          <Close />
        </IconButton>
      </Box>

      {animations.length > 0 && (
        <Box mb={3}>
          <Typography gutterBottom variant="subtitle2">
            {t("savedAnimations") || "Animaciones Guardadas"}
          </Typography>
          <Select
            fullWidth
            size="small"
            value={currentAnimationId || ""}
            onChange={(e) => onSelectAnimation(e.target.value)}
            displayEmpty
          >
            <MenuItem value="" disabled>
              {t("selectAnimation") || "Seleccionar..."}
            </MenuItem>
            {animations.map((anim) => (
              <MenuItem key={anim.id} value={anim.id}>
                {anim.name}
              </MenuItem>
            ))}
            <MenuItem
              value="new"
              sx={{ fontStyle: "italic", color: "primary.main" }}
              onClick={() => onSelectAnimation("new")}
            >
              + {t("createNew") || "Crear Nueva"}
            </MenuItem>
          </Select>
        </Box>
      )}

      <Divider sx={{ mb: 3 }} />

      <Box mb={3}>
        <Box display="flex" alignItems="center" gap={0.5} mb={1}>
          <Typography variant="subtitle2">{t("animationName") || "Nombre de la Animación"}</Typography>
          <Tooltip title={t("animationNameTooltip")}>
            <InfoIcon sx={{ fontSize: 16, color: "text.secondary", cursor: "help" }} />
          </Tooltip>
        </Box>
        <TextField
          fullWidth
          variant="outlined"
          size="small"
          value={settings.name}
          onChange={(e) => onChange("name", e.target.value)}
        />
      </Box>

      <Box mb={3}>
        <Box display="flex" alignItems="center" gap={0.5} mb={1}>
          <Typography variant="subtitle2">{t("transitionDuration") || "Duración de Transición (s)"}</Typography>
          <Tooltip title={t("transitionDurationTooltip")}>
            <InfoIcon sx={{ fontSize: 16, color: "text.secondary", cursor: "help" }} />
          </Tooltip>
        </Box>
        <Slider
          value={settings.transitionDuration}
          min={0.5}
          max={5}
          step={0.1}
          onChange={(_, val) => onChange("transitionDuration", val as number)}
          valueLabelDisplay="auto"
        />
      </Box>

      <Box mb={3}>
        <Box display="flex" alignItems="center" gap={0.5} mb={1}>
          <Typography variant="subtitle2">{t("stayDuration") || "Tiempo en Actividad (s)"}</Typography>
          <Tooltip title={t("stayDurationTooltip")}>
            <InfoIcon sx={{ fontSize: 16, color: "text.secondary", cursor: "help" }} />
          </Tooltip>
        </Box>
        <Slider
          value={settings.stayDuration}
          min={0.5}
          max={10}
          step={0.5}
          onChange={(_, val) => onChange("stayDuration", val as number)}
          valueLabelDisplay="auto"
        />
      </Box>

      <Box mb={4}>
        <Box display="flex" alignItems="center" gap={0.5} mb={1}>
          <Typography variant="subtitle2">{t("travelSpeed") || "Velocidad de Viaje"}</Typography>
          <Tooltip title={t("travelSpeedTooltip")}>
            <InfoIcon sx={{ fontSize: 16, color: "text.secondary", cursor: "help" }} />
          </Tooltip>
        </Box>
        <Slider
          value={settings.speedFactor}
          min={50}
          max={500}
          step={10}
          onChange={(_, val) => onChange("speedFactor", val as number)}
          valueLabelDisplay="auto"
        />
      </Box>

      <Box sx={{ display: "flex", gap: 1, mt: "auto" }}>
        <Button
          fullWidth
          variant="contained"
          onClick={onSave}
          disabled={isSaving || !settings.name}
          startIcon={isSaving ? <CircularProgress size={20} /> : null}
        >
          {t("save") || "Guardar"}
        </Button>
        {currentAnimationId && (
          <Button fullWidth variant="outlined" color="error" onClick={onDelete}>
            {t("delete") || "Borrar"}
          </Button>
        )}
      </Box>
    </Drawer>
  </>
)
