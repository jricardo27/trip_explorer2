import CheckCircleIcon from "@mui/icons-material/CheckCircle"
import ErrorIcon from "@mui/icons-material/Error"
import WarningIcon from "@mui/icons-material/Warning"
import { Chip, Tooltip } from "@mui/material"
import React from "react"

interface FeasibilityBadgeProps {
  isFeasible: boolean
  reason?: string
  conflicts?: string[]
}

const FeasibilityBadge: React.FC<FeasibilityBadgeProps> = ({ isFeasible, reason, conflicts }) => {
  if (isFeasible) {
    return (
      <Tooltip title="This transport option fits within the schedule">
        <Chip icon={<CheckCircleIcon />} label="Feasible" color="success" size="small" variant="outlined" />
      </Tooltip>
    )
  }

  const isTight = reason?.toLowerCase().includes("tight") || false
  const hasConflicts = (conflicts && conflicts.length > 0) || reason?.includes("conflict")

  if (isTight) {
    return (
      <Tooltip title={reason || "Tight schedule"}>
        <Chip icon={<WarningIcon />} label="Tight" color="warning" size="small" variant="outlined" />
      </Tooltip>
    )
  }

  return (
    <Tooltip title={reason || "Schedule conflict"}>
      <Chip
        icon={<ErrorIcon />}
        label={hasConflicts ? "Conflict" : "Infeasible"}
        color="error"
        size="small"
        variant="outlined"
      />
    </Tooltip>
  )
}

export default FeasibilityBadge
