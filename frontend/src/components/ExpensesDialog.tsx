import { Close as CloseIcon } from "@mui/icons-material"
import { Dialog, DialogTitle, DialogContent, Box, IconButton } from "@mui/material"

import type { Trip, Activity } from "../types"

import { ExpensesPanel } from "./ExpensesPanel"

interface ExpensesDialogProps {
  open: boolean
  onClose: () => void
  tripId: string
  defaultCurrency?: string
  currencies?: string[]
  trip?: Trip
  fullScreen?: boolean
  onEditActivity?: (activity: Activity) => void
}

export const ExpensesDialog = ({
  open,
  onClose,
  tripId,
  defaultCurrency = "AUD",
  currencies = ["AUD"],
  trip,
  fullScreen,
  onEditActivity,
}: ExpensesDialogProps) => {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth fullScreen={fullScreen}>
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          Expenses
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ height: 600, display: "flex", flexDirection: "column", p: 0 }}>
        <ExpensesPanel
          tripId={tripId}
          trip={trip}
          defaultCurrency={defaultCurrency}
          currencies={currencies}
          onEditActivity={onEditActivity}
        />
      </DialogContent>
    </Dialog>
  )
}
