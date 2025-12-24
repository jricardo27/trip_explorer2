import { Lock, LockOpen } from "@mui/icons-material"
import { Grid, TextField, Box, Checkbox, Typography } from "@mui/material"

import { useLanguageStore } from "../../stores/languageStore"

interface ActivityCostFieldsProps {
  estimatedCost: string
  setEstimatedCost: (cost: string) => void
  actualCost: string
  setActualCost: (cost: string) => void
  isPaid: boolean
  setIsPaid: (paid: boolean) => void
  isLocked: boolean
  setIsLocked: (locked: boolean) => void
  canEdit: boolean
}

export const ActivityCostFields = ({
  estimatedCost,
  setEstimatedCost,
  actualCost,
  setActualCost,
  isPaid,
  setIsPaid,
  isLocked,
  setIsLocked,
  canEdit,
}: ActivityCostFieldsProps) => {
  const { t } = useLanguageStore()

  return (
    <>
      <Grid size={{ xs: 6 }}>
        <TextField
          fullWidth
          label={t("estimatedCost")}
          type="number"
          value={estimatedCost}
          onChange={(e) => setEstimatedCost(e.target.value)}
          InputProps={{ startAdornment: "$" }}
          disabled={!canEdit}
        />
      </Grid>
      <Grid size={{ xs: 6 }}>
        <TextField
          fullWidth
          label={t("actualCost")}
          type="number"
          value={actualCost}
          onChange={(e) => setActualCost(e.target.value)}
          InputProps={{ startAdornment: "$" }}
          disabled={!canEdit}
        />
      </Grid>
      <Grid size={{ xs: 12 }}>
        <Box display="flex" alignItems="center" gap={3}>
          <Box display="flex" alignItems="center">
            <Checkbox checked={isPaid} onChange={(e) => setIsPaid(e.target.checked)} disabled={!canEdit} />
            <Typography variant="body2">{t("markAsPaid")}</Typography>
          </Box>
          <Box display="flex" alignItems="center">
            <Checkbox
              checked={isLocked}
              onChange={(e) => setIsLocked(e.target.checked)}
              icon={<LockOpen fontSize="small" />}
              checkedIcon={<Lock fontSize="small" />}
              disabled={!canEdit}
            />
            <Typography variant="body2">{isLocked ? t("locked") : t("unlocked")}</Typography>
          </Box>
        </Box>
      </Grid>
    </>
  )
}
