import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Box } from "@mui/material"
import { useState } from "react"

interface CreateTripDialogProps {
  open: boolean
  onClose: () => void
  onSubmit: (data: { name: string; startDate: string; endDate: string; defaultCurrency: string }) => void
  isLoading?: boolean
}

import { useLanguageStore } from "../stores/languageStore"

export default function CreateTripDialog({ open, onClose, onSubmit, isLoading }: CreateTripDialogProps) {
  const { t } = useLanguageStore()
  const [name, setName] = useState("")
  const [currency, setCurrency] = useState("AUD")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit({ name, startDate, endDate, defaultCurrency: currency })
    setName("")
    setStartDate("")
    setEndDate("")
    setCurrency("AUD")
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>{t("createTrip")}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}>
            <TextField
              label={t("tripName")}
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              fullWidth
              autoFocus
            />
            <TextField
              label={t("startDate")}
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label={t("endDate")}
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              required
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={isLoading}>
            {t("cancel")}
          </Button>
          <Button type="submit" variant="contained" disabled={isLoading}>
            {t("create")}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}
