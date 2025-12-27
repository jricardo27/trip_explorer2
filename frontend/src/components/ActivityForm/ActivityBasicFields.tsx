import { Lock as LockIcon, LockOpen as LockOpenIcon } from "@mui/icons-material"
import {
  Grid,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
  Box,
  Typography,
} from "@mui/material"

import { useLanguageStore } from "../../stores/languageStore"
import { ActivityType } from "../../types"

interface ActivityBasicFieldsProps {
  name: string
  setName: (name: string) => void
  activityType: ActivityType
  setActivityType: (type: ActivityType) => void
  priority: string
  setPriority: (priority: string) => void
  canEdit: boolean
  isPrivate: boolean
  setIsPrivate: (isPrivate: boolean) => void
  isLocked: boolean
  setIsLocked: (isLocked: boolean) => void
}

export const ActivityBasicFields = ({
  name,
  setName,
  activityType,
  setActivityType,
  priority,
  setPriority,
  canEdit,
  isPrivate,
  setIsPrivate,
  isLocked,
  setIsLocked,
}: ActivityBasicFieldsProps) => {
  const { t } = useLanguageStore()

  return (
    <>
      <Grid size={{ xs: 12 }}>
        <TextField
          fullWidth
          label={t("activityName")}
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          disabled={!canEdit}
        />
      </Grid>
      <Grid size={{ xs: 6 }}>
        <FormControl fullWidth disabled={!canEdit}>
          <InputLabel>{t("type")}</InputLabel>
          <Select
            value={activityType}
            label={t("type")}
            onChange={(e) => setActivityType(e.target.value as ActivityType)}
          >
            {Object.values(ActivityType).map((type) => (
              <MenuItem key={type as string} value={type}>
                {t(type as any)}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Grid>
      <Grid size={{ xs: 6 }}>
        <FormControl fullWidth disabled={!canEdit}>
          <InputLabel>{t("priority")}</InputLabel>
          <Select value={priority} label={t("priority")} onChange={(e) => setPriority(e.target.value)}>
            <MenuItem value="normal">{t("standard")}</MenuItem>
            <MenuItem value="optional">{t("optional")}</MenuItem>
            <MenuItem value="mandatory">{t("mandatory")}</MenuItem>
          </Select>
        </FormControl>
      </Grid>
      {canEdit && (
        <>
          <Grid size={{ xs: 6 }}>
            <FormControlLabel
              control={
                <Switch checked={isPrivate} onChange={(e) => setIsPrivate(e.target.checked)} disabled={!canEdit} />
              }
              label={t("privateActivity") || "Private Activity"}
            />
          </Grid>
          <Grid size={{ xs: 6 }}>
            <Box
              display="flex"
              alignItems="center"
              gap={1}
              onClick={() => canEdit && setIsLocked(!isLocked)}
              sx={{ cursor: canEdit ? "pointer" : "default", height: "100%" }}
            >
              {isLocked ? (
                <LockIcon fontSize="medium" sx={{ color: "warning.main" }} />
              ) : (
                <LockOpenIcon fontSize="medium" sx={{ color: "action.disabled" }} />
              )}
              <Typography variant="body1">{isLocked ? t("locked") : t("unlocked")}</Typography>
            </Box>
          </Grid>
        </>
      )}
    </>
  )
}
