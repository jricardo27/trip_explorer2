import {
  AttachMoney as MoneyIcon,
  CheckCircle as CheckCircleIcon,
  HelpOutline as HelpOutlineIcon,
} from "@mui/icons-material"
import { Grid, TextField, Box, Checkbox, Typography, MenuItem, InputAdornment, Tooltip } from "@mui/material"
import React from "react"

import { useLanguageStore } from "../../stores/languageStore"
import { ExpenseSplitInput, SplitType } from "../ExpenseSplitInput"

interface ActivityCostFieldsProps {
  estimatedCost: string
  setEstimatedCost: (value: string) => void
  actualCost: string
  setActualCost: (value: string) => void
  currency: string
  setCurrency: (value: string) => void
  currencies: string[]
  isPaid: boolean
  setIsPaid: (paid: boolean) => void
  canEdit: boolean
  hideCosts?: boolean
  splitType: string
  setSplitType: (type: string) => void
  splits: any[]
  setSplits: (splits: any[]) => void
  paidById: string
  setPaidById: (id: string) => void
  members: any[]
  costOnceForLinkedGroup: boolean
  setCostOnceForLinkedGroup: (value: boolean) => void
}

export const ActivityCostFields: React.FC<ActivityCostFieldsProps> = ({
  estimatedCost,
  setEstimatedCost,
  actualCost,
  setActualCost,
  currency,
  setCurrency,
  currencies = ["AUD"],
  isPaid,
  setIsPaid,
  canEdit,
  hideCosts = false,
  splitType,
  setSplitType,
  splits = [],
  setSplits,
  paidById,
  setPaidById,
  members = [],
  costOnceForLinkedGroup,
  setCostOnceForLinkedGroup,
}) => {
  const { t } = useLanguageStore()

  if (hideCosts) return null

  const safeMembers = Array.isArray(members) ? members.filter((m) => m && m.id) : []
  const safeCurrencies = Array.isArray(currencies) ? currencies : ["AUD"]
  const safeSplits = Array.isArray(splits) ? splits : []

  return (
    <Box>
      <Typography variant="subtitle2" gutterBottom>
        {t("costs")}
      </Typography>
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 4 }}>
          <TextField
            fullWidth
            label={t("estimatedCost")}
            value={estimatedCost}
            onChange={(e) => setEstimatedCost(e.target.value)}
            disabled={!canEdit}
            type="number"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <MoneyIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <TextField
            fullWidth
            label={t("actualCost")}
            value={actualCost}
            onChange={(e) => setActualCost(e.target.value)}
            disabled={!canEdit}
            type="number"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <MoneyIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <TextField
            fullWidth
            select
            label={t("currency")}
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            disabled={!canEdit}
          >
            {safeCurrencies.map((curr) => (
              <MenuItem key={curr} value={curr}>
                {curr}
              </MenuItem>
            ))}
          </TextField>
        </Grid>

        <Grid size={{ xs: 6 }}>
          <Box display="flex" alignItems="center" gap={1}>
            <Checkbox size="small" checked={isPaid} onChange={(e) => setIsPaid(e.target.checked)} disabled={!canEdit} />
            <Typography variant="body2">{t("paid")}</Typography>
            {isPaid && <CheckCircleIcon fontSize="small" sx={{ color: "success.main" }} />}
          </Box>
        </Grid>

        <Grid size={{ xs: 6 }}>
          {isPaid && (
            <TextField
              fullWidth
              select
              size="small"
              label={t("paidBy")}
              value={paidById}
              onChange={(e) => setPaidById(e.target.value)}
              disabled={!canEdit}
            >
              <MenuItem value="">
                <em>{t("selectPayer")}</em>
              </MenuItem>
              {safeMembers.map((m) => (
                <MenuItem key={m.id} value={m.id}>
                  {m.name}
                </MenuItem>
              ))}
            </TextField>
          )}
        </Grid>

        <Grid size={{ xs: 12 }}>
          <Box display="flex" alignItems="center" gap={1}>
            <Checkbox
              size="small"
              checked={costOnceForLinkedGroup}
              onChange={(e) => setCostOnceForLinkedGroup(e.target.checked)}
              disabled={!canEdit}
            />
            <Typography variant="body2">{t("costOnceForLinkedGroup")}</Typography>
            <Tooltip title={t("costOnceForLinkedGroupTooltip")}>
              <HelpOutlineIcon fontSize="small" sx={{ color: "action.disabled" }} />
            </Tooltip>
          </Box>
        </Grid>
      </Grid>

      {actualCost && parseFloat(actualCost) > 0 && (
        <Box mt={3} pt={2} borderTop={1} borderColor="divider">
          <Typography variant="subtitle2" gutterBottom color="primary">
            {t("costSplitting")}
          </Typography>
          <ExpenseSplitInput
            totalAmount={parseFloat(actualCost)}
            currency={currency}
            members={safeMembers}
            value={safeSplits}
            splitType={splitType as SplitType}
            onChange={(newSplits, newType) => {
              setSplitType(newType)
              setSplits(newSplits)
            }}
          />
        </Box>
      )}
    </Box>
  )
}
