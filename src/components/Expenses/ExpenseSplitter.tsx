import {
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Stack,
  Typography,
  Chip,
  SelectChangeEvent,
} from "@mui/material"
import React, { useState, useEffect, useCallback } from "react"

import { TripMember } from "../../types/members"

interface ExpenseSplitterProps {
  members: TripMember[]
  amount: number
  splitType: "equal" | "percentage" | "exact"
  onSplitTypeChange: (type: "equal" | "percentage" | "exact") => void
  onSplitsChange: (splits: { member_id: string; value: number }[]) => void
}

const ExpenseSplitter: React.FC<ExpenseSplitterProps> = ({
  members,
  amount,
  splitType,
  onSplitTypeChange,
  onSplitsChange,
}) => {
  const [selectedMembers, setSelectedMembers] = useState<string[]>([])
  const [customSplits, setCustomSplits] = useState<Record<string, number>>({})

  // Initialize with all members selected for equal split

  useEffect(() => {
    if (members.length > 0 && selectedMembers.length === 0) {
      setSelectedMembers(members.map((m) => m.id))
    }
  }, [members, selectedMembers.length])

  const calculateSplits = useCallback(() => {
    let splits: { member_id: string; value: number }[] = []

    if (splitType === "equal") {
      const perPerson = selectedMembers.length > 0 ? amount / selectedMembers.length : 0
      splits = selectedMembers.map((id) => ({ member_id: id, value: perPerson }))
    } else if (splitType === "percentage") {
      splits = selectedMembers.map((id) => ({
        member_id: id,
        value: customSplits[id] || 0,
      }))
    } else if (splitType === "exact") {
      splits = selectedMembers.map((id) => ({
        member_id: id,
        value: customSplits[id] || 0,
      }))
    }

    onSplitsChange(splits)
  }, [splitType, selectedMembers, customSplits, amount, onSplitsChange])

  useEffect(() => {
    calculateSplits()
  }, [calculateSplits])

  const handleMemberToggle = (memberId: string) => {
    setSelectedMembers((prev) => (prev.includes(memberId) ? prev.filter((id) => id !== memberId) : [...prev, memberId]))
  }

  const handleCustomSplitChange = (memberId: string, value: string) => {
    setCustomSplits((prev) => ({
      ...prev,
      [memberId]: parseFloat(value) || 0,
    }))
  }

  const getTotalPercentage = () => {
    return selectedMembers.reduce((sum, id) => sum + (customSplits[id] || 0), 0)
  }

  const getTotalAmount = () => {
    return selectedMembers.reduce((sum, id) => sum + (customSplits[id] || 0), 0)
  }

  return (
    <Box>
      <FormControl fullWidth size="small" sx={{ mb: 2 }}>
        <InputLabel>Split Type</InputLabel>
        <Select
          value={splitType}
          label="Split Type"
          onChange={(e: SelectChangeEvent) => onSplitTypeChange(e.target.value as "equal" | "percentage" | "exact")}
        >
          <MenuItem value="equal">Equal Split</MenuItem>
          <MenuItem value="percentage">By Percentage</MenuItem>
          <MenuItem value="exact">Exact Amounts</MenuItem>
        </Select>
      </FormControl>

      <Box sx={{ mb: 2 }}>
        <Typography variant="caption" color="text.secondary" gutterBottom>
          Select Members
        </Typography>
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mt: 1 }}>
          {members.map((member) => (
            <Chip
              key={member.id}
              label={member.name}
              onClick={() => handleMemberToggle(member.id)}
              color={selectedMembers.includes(member.id) ? "primary" : "default"}
              variant={selectedMembers.includes(member.id) ? "filled" : "outlined"}
            />
          ))}
        </Box>
      </Box>

      {splitType === "equal" && (
        <Typography variant="body2" color="text.secondary">
          Each person pays: ${selectedMembers.length > 0 ? (amount / selectedMembers.length).toFixed(2) : "0.00"}
        </Typography>
      )}

      {splitType === "percentage" && (
        <Box>
          <Stack spacing={1}>
            {selectedMembers.map((memberId) => {
              const member = members.find((m) => m.id === memberId)
              return (
                <Stack key={memberId} direction="row" spacing={2} alignItems="center">
                  <Typography sx={{ minWidth: 100 }}>{member?.name}</Typography>
                  <TextField
                    type="number"
                    size="small"
                    value={customSplits[memberId] || ""}
                    onChange={(e) => handleCustomSplitChange(memberId, e.target.value)}
                    InputProps={{ endAdornment: "%" }}
                    sx={{ width: 100 }}
                  />
                  <Typography variant="body2" color="text.secondary">
                    = ${(((customSplits[memberId] || 0) * amount) / 100).toFixed(2)}
                  </Typography>
                </Stack>
              )
            })}
          </Stack>
          <Typography
            variant="body2"
            color={getTotalPercentage() === 100 ? "success.main" : "error.main"}
            sx={{ mt: 1 }}
          >
            Total: {getTotalPercentage()}% {getTotalPercentage() !== 100 && "(must equal 100%)"}
          </Typography>
        </Box>
      )}

      {splitType === "exact" && (
        <Box>
          <Stack spacing={1}>
            {selectedMembers.map((memberId) => {
              const member = members.find((m) => m.id === memberId)
              return (
                <Stack key={memberId} direction="row" spacing={2} alignItems="center">
                  <Typography sx={{ minWidth: 100 }}>{member?.name}</Typography>
                  <TextField
                    type="number"
                    size="small"
                    value={customSplits[memberId] || ""}
                    onChange={(e) => handleCustomSplitChange(memberId, e.target.value)}
                    InputProps={{ startAdornment: "$" }}
                    sx={{ width: 120 }}
                  />
                </Stack>
              )
            })}
          </Stack>
          <Typography
            variant="body2"
            color={Math.abs(getTotalAmount() - amount) < 0.01 ? "success.main" : "error.main"}
            sx={{ mt: 1 }}
          >
            Total: ${getTotalAmount().toFixed(2)} / ${amount.toFixed(2)}
          </Typography>
        </Box>
      )}
    </Box>
  )
}

export default ExpenseSplitter
