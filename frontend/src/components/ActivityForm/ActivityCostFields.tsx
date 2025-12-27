import { Lock, LockOpen } from "@mui/icons-material"
import { Grid, TextField, Box, Checkbox, Typography, MenuItem } from "@mui/material"

import { useLanguageStore } from "../../stores/languageStore"

interface ActivityCostFieldsProps {
  estimatedCost: string
  setEstimatedCost: (cost: string) => void
  actualCost: string
  setActualCost: (cost: string) => void
  currency: string
  setCurrency: (currency: string) => void
  currencies?: string[]
  isPaid: boolean
  setIsPaid: (paid: boolean) => void
  isLocked: boolean
  setIsLocked: (locked: boolean) => void
  canEdit: boolean
  hideCosts?: boolean
}

export const ActivityCostFields = ({
  estimatedCost,
  setEstimatedCost,
  actualCost,
  setActualCost,
  currency,
  setCurrency,
  currencies = ["AUD"],
  isPaid,
  setIsPaid,
  isLocked,
  setIsLocked,
  canEdit,
  hideCosts = false,
}: ActivityCostFieldsProps) => {
  const { t } = useLanguageStore()

  if (hideCosts) return null

  return (
    <>
      <Grid size={{ xs: 6 }}>
        <TextField
          fullWidth
          label={t("estimatedCost")}
          type="number"
          value={estimatedCost}
          onChange={(e) => setEstimatedCost(e.target.value)}
          InputProps={{
            startAdornment: (
              <TextField
                select
                variant="standard"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                InputProps={{ disableUnderline: true }}
                sx={{ width: 60, mr: 1 }}
                disabled={!canEdit}
              >
                {currencies.map((curr) => (
                  <MenuItem key={curr} value={curr}>
                    {curr}
                  </MenuItem>
                ))}
              </TextField>
            ),
          }}
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
          InputProps={{
            startAdornment: (
              <Typography color="text.secondary" sx={{ mr: 1, fontSize: "0.9rem" }}>
                {currency}
              </Typography>
            ),
          }}
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
