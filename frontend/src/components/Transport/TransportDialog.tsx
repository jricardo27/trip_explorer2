import {
  ContentCopy as CopyIcon,
  Delete as DeleteIcon,
  DirectionsCar,
  DirectionsBus,
  DirectionsWalk,
  Train,
  Flight,
  DirectionsBoat,
  PedalBike,
  HelpOutline,
} from "@mui/icons-material"
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  IconButton,
  TextField,
  MenuItem,
  Grid,
  Typography,
  Box,
  Radio,
  Tooltip,
} from "@mui/material"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"

import { transportApi } from "../../api/client"
import { useExpenses } from "../../hooks/useExpenses"
import { useTripMembers } from "../../hooks/useTripMembers"
import { useLanguageStore } from "../../stores/languageStore"
import { TransportMode } from "../../types"
import type { TransportAlternative } from "../../types"
import { ExpenseSplitInput, type SplitType, type ExpenseSplit } from "../ExpenseSplitInput"

interface TransportDialogProps {
  open: boolean
  onClose: () => void
  tripId: string
  fromActivityId: string
  toActivityId: string
  alternatives: TransportAlternative[]
}

const getIcon = (mode: TransportMode) => {
  switch (mode) {
    case TransportMode.DRIVING:
      return <DirectionsCar />
    case TransportMode.WALKING:
      return <DirectionsWalk />
    case TransportMode.CYCLING:
      return <PedalBike />
    case TransportMode.TRANSIT:
      return <DirectionsBus /> // Generic transit
    case TransportMode.BUS:
      return <DirectionsBus />
    case TransportMode.TRAIN:
      return <Train />
    case TransportMode.FLIGHT:
      return <Flight />
    case TransportMode.FERRY:
      return <DirectionsBoat />
    default:
      return <HelpOutline />
  }
}

export const TransportDialog = ({
  open,
  onClose,
  tripId,
  fromActivityId,
  toActivityId,
  alternatives,
}: TransportDialogProps) => {
  const queryClient = useQueryClient()
  const { expenses } = useExpenses(tripId)
  const { t } = useLanguageStore()
  const { members } = useTripMembers(tripId)

  const [newMode, setNewMode] = useState<TransportMode>(TransportMode.DRIVING)
  const [newDuration, setNewDuration] = useState<string>("")
  const [newCost, setNewCost] = useState<string>("")
  const [newCurrency, setNewCurrency] = useState("AUD")
  const [newNotes, setNewNotes] = useState("")
  const [splits, setSplits] = useState<ExpenseSplit[]>([])
  const [splitType, setSplitType] = useState<SplitType>("equal")

  const [isAdding, setIsAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const createMutation = useMutation({
    mutationFn: transportApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trips", tripId] })
      resetForm()
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => transportApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trips", tripId] })
      resetForm()
    },
  })

  const selectMutation = useMutation({
    mutationFn: transportApi.select,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trips", tripId] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: transportApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trips", tripId] })
    },
  })

  const handleAdd = () => {
    const payload = {
      tripId,
      fromActivityId,
      toActivityId,
      transportMode: newMode,
      durationMinutes: parseInt(newDuration) || 0,
      cost: newCost ? parseFloat(newCost) : undefined,
      currency: newCurrency,
      notes: newNotes,
      splits: newCost ? splits : undefined,
    }

    if (editingId) {
      updateMutation.mutate({ id: editingId, data: payload })
    } else {
      createMutation.mutate(payload)
    }
  }

  const resetForm = () => {
    setIsAdding(false)
    setEditingId(null)
    setNewDuration("")
    setNewCost("")
    setNewNotes("")
    setSplits([])
    setSplitType("equal")
  }

  const handleCopy = (alt: TransportAlternative) => {
    setNewMode(alt.transportMode)
    setNewDuration(alt.durationMinutes.toString())
    setNewCost(alt.cost?.toString() || "")
    setNewCurrency(alt.currency || "AUD")
    setNewNotes(alt.notes || "")
    setSplits([]) // Don't copy splits
    setIsAdding(true)
    setEditingId(null)
  }

  const handleEdit = (alt: TransportAlternative) => {
    setNewMode(alt.transportMode)
    setNewDuration(alt.durationMinutes.toString())
    setNewCost(alt.cost?.toString() || "")
    setNewCurrency(alt.currency || "AUD")
    setNewNotes(alt.notes || "")

    // Find associated expense
    const expense = expenses.find((e) => e.transportAlternativeId === alt.id)
    if (expense?.splits && expense.splits.length > 0) {
      setSplits(
        expense.splits.map((s) => ({
          memberId: s.memberId,
          amount: Number(s.amount),
          percentage: s.percentage ? Number(s.percentage) : undefined,
        })),
      )
      setSplitType((expense.splitType as SplitType) || "equal")
    } else {
      setSplits([])
      setSplitType("equal")
    }

    setEditingId(alt.id)
    setIsAdding(true)
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{t("transportOptions")}</DialogTitle>
      <DialogContent>
        <List>
          {alternatives.map((alt) => (
            <ListItem
              key={alt.id}
              secondaryAction={
                <Box>
                  <Tooltip title={t("copy")}>
                    <IconButton edge="end" onClick={() => handleCopy(alt)} sx={{ mr: 1 }}>
                      <CopyIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title={t("edit")}>
                    <IconButton edge="end" onClick={() => handleEdit(alt)} sx={{ mr: 1 }}>
                      <DirectionsCar color="primary" /> {/* Reusing generic icon for edit indicating 'Configure' */}
                    </IconButton>
                  </Tooltip>
                  <Tooltip title={t("delete")}>
                    <IconButton edge="end" onClick={() => deleteMutation.mutate(alt.id)}>
                      <DeleteIcon />
                    </IconButton>
                  </Tooltip>
                </Box>
              }
            >
              <ListItemIcon onClick={() => selectMutation.mutate(alt.id)} style={{ cursor: "pointer" }}>
                <Radio checked={alt.isSelected} />
              </ListItemIcon>
              <ListItemIcon>{getIcon(alt.transportMode)}</ListItemIcon>
              <ListItemText
                primary={alt.name || alt.transportMode}
                secondary={`${alt.durationMinutes} min • ${alt.cost ? `$${alt.cost}` : t("free")}`}
              />
            </ListItem>
          ))}
          {alternatives.length === 0 && !isAdding && (
            <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 2 }}>
              {t("noTransportOptions")}
            </Typography>
          )}
        </List>

        {isAdding ? (
          <Box sx={{ mt: 2, p: 2, border: "1px solid #eee", borderRadius: 1 }}>
            <Grid container spacing={2}>
              <Grid size={12}>
                <TextField
                  select
                  label={t("mode")}
                  fullWidth
                  value={newMode}
                  onChange={(e) => setNewMode(e.target.value as TransportMode)}
                >
                  {Object.values(TransportMode).map((mode) => (
                    <MenuItem key={mode} value={mode}>
                      {t(mode as any)}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid size={6}>
                <TextField
                  label={t("durationMin")}
                  type="number"
                  fullWidth
                  value={newDuration}
                  onChange={(e) => setNewDuration(e.target.value)}
                />
              </Grid>
              <Grid size={4}>
                <TextField
                  label={t("cost")}
                  type="number"
                  fullWidth
                  value={newCost}
                  onChange={(e) => setNewCost(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <TextField
                        select
                        variant="standard"
                        value={newCurrency}
                        onChange={(e) => setNewCurrency(e.target.value)}
                        InputProps={{ disableUnderline: true }}
                        sx={{ width: 60, mr: 1 }}
                      >
                        {["AUD", "USD", "EUR", "GBP", "JPY", "CAD", "NZD"].map((curr) => (
                          <MenuItem key={curr} value={curr}>
                            {curr}
                          </MenuItem>
                        ))}
                      </TextField>
                    ),
                  }}
                />
              </Grid>
              <Grid size={12}>
                <TextField
                  label={t("notes")}
                  fullWidth
                  multiline
                  rows={2}
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  placeholder={t("transportNotesPlaceholder")}
                />
              </Grid>
              {newCost && (
                <Grid size={12}>
                  <ExpenseSplitInput
                    members={members}
                    totalAmount={parseFloat(newCost) || 0}
                    currency={newCurrency}
                    value={splits}
                    splitType={splitType}
                    onChange={(newSplits, newType) => {
                      setSplits(newSplits)
                      setSplitType(newType)
                    }}
                  />
                </Grid>
              )}
              <Grid size={12} container justifyContent="flex-end" spacing={1}>
                <Button onClick={resetForm}>{t("cancel")}</Button>
                <Button
                  variant="contained"
                  onClick={handleAdd}
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  {editingId ? t("save") : t("add")}
                </Button>
              </Grid>
            </Grid>
          </Box>
        ) : (
          <Button
            fullWidth
            variant="outlined"
            sx={{ mt: 1 }}
            onClick={() => {
              resetForm()
              setIsAdding(true)
            }}
          >
            {t("addOption")}
          </Button>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t("close")}</Button>
      </DialogActions>
    </Dialog>
  )
}
