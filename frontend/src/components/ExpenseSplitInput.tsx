import { AttachMoney, Percent, PieChart } from "@mui/icons-material"
import {
  Box,
  TextField,
  Typography,
  ToggleButton,
  ToggleButtonGroup,
  Avatar,
  InputAdornment,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Checkbox,
} from "@mui/material"
import React from "react"

import { useLanguageStore } from "../stores/languageStore"
import type { TripMember } from "../types"

export type SplitType = "equal" | "percentage" | "amount" | "shares"

export interface ExpenseSplit {
  memberId: string
  amount: number
  percentage?: number
  shares?: number
}

interface ExpenseSplitInputProps {
  members: TripMember[]
  totalAmount: number
  currency: string
  value: ExpenseSplit[]
  splitType: SplitType
  onChange: (splits: ExpenseSplit[], type: SplitType) => void
  error?: string
}

export const ExpenseSplitInput: React.FC<ExpenseSplitInputProps> = ({
  members,
  totalAmount,
  currency,
  value,
  splitType,
  onChange,
  error,
}) => {
  const { t } = useLanguageStore()
  // Internal state for manual inputs adds smoother typing
  // Effects will sync it back to parent

  const handleSplitTypeChange = (_: React.MouseEvent<HTMLElement>, newType: SplitType | null) => {
    if (newType !== null) {
      recalculateSplits(newType, value, members, totalAmount)
    }
  }

  // Main calculation logic
  const recalculateSplits = (
    type: SplitType,
    currentSplits: ExpenseSplit[],
    currentMembers: TripMember[],
    amount: number,
  ) => {
    let newSplits: ExpenseSplit[] = []

    // Basic reset or conversion
    // Ensure all members are present in splits or at least tracking them
    // For Equal: Included members get equal share
    // For others: Preserve generic input if possible

    const activeMembers =
      currentSplits.length > 0
        ? currentMembers.filter((m) => currentSplits.some((s) => s.memberId === m.id))
        : currentMembers // Default to all if empty

    if (type === "equal") {
      const count = activeMembers.length
      const perPerson = count > 0 ? Number((amount / count).toFixed(2)) : 0
      // Distribute remainders?
      // Simple approach first
      newSplits = activeMembers.map((m) => ({
        memberId: m.id,
        amount: perPerson,
      }))
      // Fix rounding error on last person
      if (activeMembers.length > 0) {
        const currentSum = newSplits.reduce((acc, s) => acc + s.amount, 0)
        const diff = Number((amount - currentSum).toFixed(2))
        if (diff !== 0) {
          newSplits[0].amount = Number((newSplits[0].amount + diff).toFixed(2))
        }
      }
    } else if (type === "percentage") {
      // Default to equal % if switching or empty
      const count = activeMembers.length
      const perPersonPct = count > 0 ? Number((100 / count).toFixed(2)) : 0
      newSplits = activeMembers.map((m) => {
        const existing = currentSplits.find((s) => s.memberId === m.id)
        return {
          memberId: m.id,
          percentage: existing?.percentage ?? perPersonPct,
          amount: Number((amount * ((existing?.percentage ?? perPersonPct) / 100)).toFixed(2)),
        }
      })
    } else if (type === "shares") {
      newSplits = activeMembers.map((m) => {
        const existing = currentSplits.find((s) => s.memberId === m.id)
        const shares = existing?.shares ?? 1
        return {
          memberId: m.id,
          shares: shares,
          amount: 0, // Calc later
        }
      })
      // Recalc amounts based on shares
      const totalShares = newSplits.reduce((acc, s) => acc + (s.shares || 0), 0)
      if (totalShares > 0) {
        newSplits = newSplits.map((s) => ({
          ...s,
          amount: Number((amount * ((s.shares || 0) / totalShares)).toFixed(2)),
        }))
      }
    } else if (type === "amount") {
      newSplits = activeMembers.map((m) => {
        const existing = currentSplits.find((s) => s.memberId === m.id)
        return {
          memberId: m.id,
          amount: existing?.amount ?? 0,
        }
      })
    }

    onChange(newSplits, type)
  }

  const handleToggleMember = (memberId: string) => {
    const isIncluded = value.some((s) => s.memberId === memberId)
    let nextSplits: ExpenseSplit[] = []

    if (isIncluded) {
      // Remove
      nextSplits = value.filter((s) => s.memberId !== memberId)
    } else {
      // Add
      nextSplits = [...value, { memberId, amount: 0, percentage: 0, shares: 1 }]
    }

    // Recalculate based on new list
    // Note: We need to pass the FULL member objects for recalculation context if needed,
    // but recalculateSplits takes members list.
    // We filter members based on the new nextSplits inside logic?
    // Actually recalculateSplits logic above assumes `activeMembers` is derived from `currentSplits`.
    // So passing `nextSplits` is enough.

    recalculateSplits(splitType, nextSplits, members, totalAmount)
  }

  const handleValueChange = (memberId: string, inputVal: string) => {
    const numVal = parseFloat(inputVal) || 0

    let nextSplits = value.map((s) => {
      if (s.memberId !== memberId) return s

      if (splitType === "percentage") {
        return { ...s, percentage: numVal, amount: Number((totalAmount * (numVal / 100)).toFixed(2)) }
      } else if (splitType === "shares") {
        // Update shares, then recalc all amounts
        return { ...s, shares: numVal }
      } else if (splitType === "amount") {
        return { ...s, amount: numVal }
      }
      return s
    })

    if (splitType === "shares") {
      const totalShares = nextSplits.reduce((acc, s) => acc + (s.shares || 0), 0)
      if (totalShares > 0) {
        nextSplits = nextSplits.map((s) => ({
          ...s,
          amount: Number((totalAmount * ((s.shares || 0) / totalShares)).toFixed(2)),
        }))
      }
    }

    onChange(nextSplits, splitType)
  }

  return (
    <Box sx={{ mt: 2 }}>
      <Box sx={{ display: "flex", justifyContent: "center", mb: 2 }}>
        <ToggleButtonGroup
          value={splitType}
          exclusive
          onChange={handleSplitTypeChange}
          aria-label="split type"
          size="small"
        >
          <ToggleButton value="equal" aria-label="equal split">
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
              = <Typography variant="caption">{t("equal")}</Typography>
            </Box>
          </ToggleButton>
          <ToggleButton value="amount" aria-label="exact amount">
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
              <AttachMoney fontSize="small" /> <Typography variant="caption">{t("amount")}</Typography>
            </Box>
          </ToggleButton>
          <ToggleButton value="percentage" aria-label="percentage">
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
              <Percent fontSize="small" /> <Typography variant="caption">%</Typography>
            </Box>
          </ToggleButton>
          <ToggleButton value="shares" aria-label="shares">
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
              <PieChart fontSize="small" /> <Typography variant="caption">{t("shares")}</Typography>
            </Box>
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {error && (
        <Typography color="error" variant="caption" display="block" sx={{ mb: 1, textAlign: "center" }}>
          {error}
        </Typography>
      )}

      <List dense>
        {members.map((member) => {
          const split = value.find((s) => s.memberId === member.id)
          const isIncluded = !!split

          return (
            <ListItem
              key={member.id}
              secondaryAction={
                isIncluded && splitType !== "equal" ? (
                  <TextField
                    variant="standard"
                    size="small"
                    type="number"
                    value={
                      splitType === "percentage"
                        ? (split.percentage ?? 0)
                        : splitType === "shares"
                          ? (split.shares ?? 1)
                          : (split.amount ?? 0)
                    }
                    onChange={(e) => handleValueChange(member.id, e.target.value)}
                    sx={{ width: 80 }}
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          {splitType === "percentage" ? "%" : splitType === "shares" ? "x" : currency}
                        </InputAdornment>
                      ),
                    }}
                  />
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    {isIncluded ? `${currency}${Number(split?.amount || 0).toFixed(2)}` : "-"}
                  </Typography>
                )
              }
            >
              <Checkbox edge="start" checked={isIncluded} onChange={() => handleToggleMember(member.id)} />
              <ListItemAvatar>
                <Avatar
                  sx={{
                    width: 24,
                    height: 24,
                    bgcolor: member.color || "grey.400",
                    fontSize: "0.75rem",
                  }}
                  src={member.avatarUrl || undefined}
                >
                  {member.name ? member.name.charAt(0) : "?"}
                </Avatar>
              </ListItemAvatar>
              <ListItemText
                primary={member.name || "Unnamed Member"}
                primaryTypographyProps={{
                  variant: "body2",
                  color: isIncluded ? "text.primary" : "text.disabled",
                }}
              />
            </ListItem>
          )
        })}
      </List>

      {splitType !== "equal" && (
        <Box sx={{ display: "flex", justifyContent: "space-between", px: 2, mt: 1 }}>
          <Typography variant="caption" color="text.secondary">
            {t("totalAllocated")}:
          </Typography>
          <Typography
            variant="caption"
            color={
              Math.abs(value.reduce((a, b) => a + Number(b.amount || 0), 0) - totalAmount) > 0.1
                ? "error"
                : "success.main"
            }
          >
            {currency}
            {value.reduce((a, b) => a + Number(b.amount || 0), 0).toFixed(2)} / {currency}
            {totalAmount.toFixed(2)}
          </Typography>
        </Box>
      )}
    </Box>
  )
}
