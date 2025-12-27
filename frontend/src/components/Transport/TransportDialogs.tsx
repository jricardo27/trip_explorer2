import { Edit as EditIcon, Delete as DeleteIcon } from "@mui/icons-material"
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  List,
  ListItemText,
  ListItemIcon,
  IconButton,
  TextField,
  MenuItem,
  Grid,
  Typography,
  Box,
  Radio,
  FormControlLabel,
  Checkbox,
  Link,
} from "@mui/material"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useState, useEffect } from "react"

import { transportApi } from "../../api/client"
import { useExpenses } from "../../hooks/useExpenses"
import { useTripMembers } from "../../hooks/useTripMembers"
import { useLanguageStore } from "../../stores/languageStore"
import { TransportMode, type Activity, TransportAlternative } from "../../types"
import { ExpenseSplitInput, type SplitType, type ExpenseSplit } from "../ExpenseSplitInput"

import { TransportRouteMap } from "./TransportRouteMap"
import { getTransportIcon } from "./transportUtils"

// 1. NON-EDITABLE VIEW DIALOG
interface TransportViewDialogProps {
  open: boolean
  onClose: () => void
  alternative: TransportAlternative
}

export const TransportViewDialog = ({ open, onClose, alternative }: TransportViewDialogProps) => {
  const { t } = useLanguageStore()

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          {getTransportIcon(alternative.transportMode)}
          <Typography variant="h6">{alternative.name || alternative.transportMode}</Typography>
        </Box>
      </DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 1 }}>
          <Typography variant="subtitle2" color="text.secondary">
            {alternative.durationMinutes} min •{" "}
            {alternative.cost ? `${alternative.cost} ${alternative.currency || "AUD"}` : t("free")}
          </Typography>

          {alternative.description && (
            <Box mt={2}>
              <Typography variant="body2">
                <strong>{t("description")}:</strong>
              </Typography>
              <Typography variant="body2">{alternative.description}</Typography>
            </Box>
          )}

          {alternative.pros && alternative.pros.length > 0 && (
            <Box mt={2}>
              <Typography variant="body2" color="success.main">
                <strong>{t("pros")}:</strong>
              </Typography>
              <ul style={{ margin: 0, paddingLeft: 20 }}>
                {alternative.pros.map((p: string, i: number) => (
                  <li key={i}>
                    <Typography variant="body2">{p}</Typography>
                  </li>
                ))}
              </ul>
            </Box>
          )}

          {alternative.cons && alternative.cons.length > 0 && (
            <Box mt={2}>
              <Typography variant="body2" color="error.main">
                <strong>{t("cons")}:</strong>
              </Typography>
              <ul style={{ margin: 0, paddingLeft: 20 }}>
                {alternative.cons.map((c: string, i: number) => (
                  <li key={i}>
                    <Typography variant="body2">{c}</Typography>
                  </li>
                ))}
              </ul>
            </Box>
          )}

          {alternative.requiresBooking && (
            <Box mt={2}>
              <Typography variant="body2">
                <strong>{t("booking")}:</strong> {alternative.bookingReference || t("pending")}
              </Typography>
              {alternative.bookingUrl && (
                <Link href={alternative.bookingUrl} target="_blank" rel="noopener" variant="body2">
                  {t("bookingLink")}
                </Link>
              )}
            </Box>
          )}

          {alternative.notes && (
            <Box mt={2}>
              <Typography variant="body2" sx={{ fontStyle: "italic" }}>
                {alternative.notes}
              </Typography>
            </Box>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t("close")}</Button>
      </DialogActions>
    </Dialog>
  )
}

// 2. EDITABLE VIEW DIALOG (FORM)
interface TransportEditDialogProps {
  open: boolean
  onClose: () => void
  tripId: string
  fromActivityId: string
  toActivityId: string
  alternative?: TransportAlternative // Optional for "Add" mode
  currencies: string[]
}

export const TransportEditDialog = ({
  open,
  onClose,
  tripId,
  fromActivityId,
  toActivityId,
  alternative,
  currencies,
}: TransportEditDialogProps) => {
  const queryClient = useQueryClient()
  const { t } = useLanguageStore()
  const { expenses } = useExpenses(tripId)
  const { members } = useTripMembers(tripId)

  const [name, setName] = useState("")
  const [mode, setMode] = useState<TransportMode>(TransportMode.DRIVING)
  const [duration, setDuration] = useState("")
  const [cost, setCost] = useState("")
  const [currency, setCurrency] = useState(currencies[0] || "AUD")
  const [notes, setNotes] = useState("")
  const [description, setDescription] = useState("")
  const [pros, setPros] = useState("")
  const [cons, setCons] = useState("")
  const [requiresBooking, setRequiresBooking] = useState(false)
  const [bookingUrl, setBookingUrl] = useState("")
  const [bookingReference, setBookingReference] = useState("")
  const [isFeasible, setIsFeasible] = useState(true)
  const [infeasibilityReason, setInfeasibilityReason] = useState("")
  const [splits, setSplits] = useState<ExpenseSplit[]>([])
  const [splitType, setSplitType] = useState<SplitType>("equal")
  const [userEditedName, setUserEditedName] = useState(false)

  useEffect(() => {
    if (open) {
      setTimeout(() => {
        if (alternative) {
          setName(alternative.name || "")
          setMode(alternative.transportMode)
          setDuration(alternative.durationMinutes.toString())
          setCost(alternative.cost?.toString() || "")
          setCurrency(alternative.currency || currencies[0] || "AUD")
          setNotes(alternative.notes || "")
          setDescription(alternative.description || "")
          setPros(alternative.pros?.join("\n") || "")
          setCons(alternative.cons?.join("\n") || "")
          setRequiresBooking(alternative.requiresBooking)
          setBookingUrl(alternative.bookingUrl || "")
          setBookingReference(alternative.bookingReference || "")
          setIsFeasible(alternative.isFeasible)
          setInfeasibilityReason(alternative.infeasibilityReason || "")
          setUserEditedName(true)

          const expense = expenses.find((e) => e.transportAlternativeId === alternative.id)
          if (expense?.splits) {
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
        } else {
          // Reset for add mode
          setMode(TransportMode.DRIVING) // This will trigger handleModeChange
          setDuration("")
          setCost("")
          setCurrency(currencies[0] || "AUD")
          setNotes("")
          setDescription("")
          setPros("")
          setCons("")
          setRequiresBooking(false)
          setBookingUrl("")
          setBookingReference("")
          setIsFeasible(true)
          setInfeasibilityReason("")
          setSplits([])
          setSplitType("equal")
          setUserEditedName(false)
        }
      }, 0)
    }
  }, [alternative, open, currencies, expenses])

  const handleModeChange = (newMode: TransportMode) => {
    setMode(newMode)
    if (!userEditedName && !alternative) {
      setName(t(newMode as any) || newMode)
    }
  }

  const mutation = useMutation({
    mutationFn: (data: any) => (alternative ? transportApi.update(alternative.id, data) : transportApi.create(data)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trips", tripId] })
      queryClient.invalidateQueries({ queryKey: ["public-trip"] })
      onClose()
    },
  })

  const handleSave = () => {
    const hasCost = cost && cost.trim() !== ""
    mutation.mutate({
      tripId,
      fromActivityId,
      toActivityId,
      name: name || t(mode as any) || mode,
      transportMode: mode,
      durationMinutes: parseInt(duration) || 0,
      cost: hasCost ? parseFloat(cost) : undefined,
      currency,
      notes,
      description,
      pros: pros.split("\n").filter((p) => p.trim()),
      cons: cons.split("\n").filter((c) => c.trim()),
      requiresBooking,
      bookingUrl,
      bookingReference,
      isFeasible,
      infeasibilityReason: isFeasible ? "" : infeasibilityReason,
      splits: hasCost ? splits : undefined,
      splitType: hasCost ? splitType : undefined,
    })
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>{alternative ? t("editTransport") : t("addTransport")}</DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid size={12}>
            <TextField
              label={t("name") || "Name"}
              fullWidth
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                setUserEditedName(true)
              }}
            />
          </Grid>
          <Grid size={12}>
            <TextField
              select
              label={t("mode")}
              fullWidth
              value={mode}
              onChange={(e) => handleModeChange(e.target.value as TransportMode)}
            >
              {Object.values(TransportMode).map((m) => (
                <MenuItem key={m} value={m}>
                  {t(m as any)}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid size={6}>
            <TextField
              label={t("durationMin")}
              type="number"
              fullWidth
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
            />
          </Grid>
          <Grid size={6}>
            <TextField
              label={t("cost")}
              type="number"
              fullWidth
              value={cost}
              onChange={(e) => setCost(e.target.value)}
              InputProps={{
                startAdornment: (
                  <TextField
                    select
                    variant="standard"
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    InputProps={{ disableUnderline: true }}
                    sx={{ width: 60, mr: 1 }}
                  >
                    {currencies.map((curr) => (
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
              label={t("description")}
              fullWidth
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </Grid>
          <Grid size={12}>
            <TextField
              label={t("notes")}
              fullWidth
              multiline
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </Grid>
          <Grid size={6}>
            <TextField
              label={t("pros")}
              fullWidth
              multiline
              rows={3}
              value={pros}
              onChange={(e) => setPros(e.target.value)}
            />
          </Grid>
          <Grid size={6}>
            <TextField
              label={t("cons")}
              fullWidth
              multiline
              rows={3}
              value={cons}
              onChange={(e) => setCons(e.target.value)}
            />
          </Grid>
          <Grid size={12}>
            <FormControlLabel
              control={<Checkbox checked={requiresBooking} onChange={(e) => setRequiresBooking(e.target.checked)} />}
              label={t("requiresBooking")}
            />
          </Grid>
          {requiresBooking && (
            <>
              <Grid size={12}>
                <TextField
                  label={t("bookingUrl")}
                  fullWidth
                  value={bookingUrl}
                  onChange={(e) => setBookingUrl(e.target.value)}
                />
              </Grid>
              <Grid size={12}>
                <TextField
                  label={t("bookingReference")}
                  fullWidth
                  value={bookingReference}
                  onChange={(e) => setBookingReference(e.target.value)}
                />
              </Grid>
            </>
          )}
          <Grid size={12}>
            <FormControlLabel
              control={<Checkbox checked={isFeasible} onChange={(e) => setIsFeasible(e.target.checked)} />}
              label={t("isFeasible")}
            />
          </Grid>
          {!isFeasible && (
            <Grid size={12}>
              <TextField
                label={t("infeasibilityReason")}
                fullWidth
                multiline
                value={infeasibilityReason}
                onChange={(e) => setInfeasibilityReason(e.target.value)}
              />
            </Grid>
          )}
          {cost && cost.trim() !== "" && (
            <Grid size={12}>
              <ExpenseSplitInput
                members={members}
                totalAmount={parseFloat(cost) || 0}
                currency={currency}
                value={splits}
                splitType={splitType}
                onChange={(ns: ExpenseSplit[], nt: SplitType) => {
                  setSplits(ns)
                  setSplitType(nt)
                }}
              />
            </Grid>
          )}
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t("cancel")}</Button>
        <Button variant="contained" onClick={handleSave} disabled={mutation.isPending}>
          {t("save")}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

// 3. SELECTION DIALOG
interface TransportSelectionDialogProps {
  open: boolean
  onClose: () => void
  tripId: string
  fromActivityId: string
  toActivityId: string
  alternatives: TransportAlternative[]
  onEdit: (alt: TransportAlternative) => void
  onDelete: (id: string) => void
  fromActivity?: Activity
  toActivity?: Activity
}

export const TransportSelectionDialog = ({
  open,
  onClose,
  tripId,
  fromActivityId,
  toActivityId,
  alternatives,
  onEdit,
  fromActivity,
  toActivity,
}: TransportSelectionDialogProps) => {
  const { t } = useLanguageStore()
  const queryClient = useQueryClient()
  const [initialSelectedId, setInitialSelectedId] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      const currentSelected = alternatives.find((a) => a.isSelected)
      setInitialSelectedId(currentSelected?.id || null)
    }
  }, [open, alternatives])

  const selectMutation = useMutation({
    mutationFn: transportApi.select,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trips", tripId] })
      queryClient.invalidateQueries({ queryKey: ["public-trip"] })
    },
  })

  const deselectAllMutation = useMutation({
    mutationFn: () => transportApi.deselectAll(tripId, fromActivityId, toActivityId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trips", tripId] })
      queryClient.invalidateQueries({ queryKey: ["public-trip"] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: transportApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trips", tripId] })
      queryClient.invalidateQueries({ queryKey: ["public-trip"] })
    },
  })

  const handleClose = () => {
    const currentSelected = alternatives.find((a) => a.isSelected)
    if (currentSelected?.id !== initialSelectedId) {
      if (initialSelectedId) {
        selectMutation.mutate(initialSelectedId)
      } else {
        deselectAllMutation.mutate()
      }
    }
    onClose()
  }

  const handleEdit = (alt: TransportAlternative) => {
    onEdit(alt)
  }

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    deleteMutation.mutate(id)
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          {t("chooseTransport")}
          {alternatives.some((a) => a.isSelected) && (
            <Button size="small" variant="outlined" color="secondary" onClick={() => deselectAllMutation.mutate()}>
              {t("clearSelection")}
            </Button>
          )}
        </Box>
      </DialogTitle>
      <DialogContent sx={{ p: 0, display: "flex", height: 500 }}>
        {/* Left side: List of alternatives */}
        <Box sx={{ width: fromActivity && toActivity ? "50%" : "100%", overflowY: "auto", p: 2 }}>
          <List>
            {alternatives.map((alt) => (
              <Box key={alt.id} sx={{ mb: 1, border: "1px solid #eee", borderRadius: 1 }}>
                <Box display="flex" alignItems="center" p={1}>
                  <Radio checked={alt.isSelected} onChange={() => selectMutation.mutate(alt.id)} />
                  <ListItemIcon sx={{ minWidth: 40 }}>{getTransportIcon(alt.transportMode)}</ListItemIcon>
                  <ListItemText primary={alt.name || alt.transportMode} secondary={`${alt.durationMinutes} min`} />
                  <Box sx={{ display: "flex", gap: 0.5 }}>
                    <IconButton size="small" onClick={() => handleEdit(alt)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={(e) => handleDelete(e, alt.id)}
                      disabled={deleteMutation.isPending}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </Box>
              </Box>
            ))}
            {alternatives.length === 0 && (
              <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 2 }}>
                {t("noTransportOptions")}
              </Typography>
            )}
          </List>
        </Box>

        {/* Right side: Map */}
        {fromActivity && toActivity && (
          <Box sx={{ width: "50%", borderLeft: "1px solid #eee" }}>
            <TransportRouteMap
              alternatives={alternatives}
              selectedId={alternatives.find((a) => a.isSelected)?.id || null}
              onSelectAlternative={(id) => selectMutation.mutate(id)}
              fromActivity={fromActivity}
              toActivity={toActivity}
            />
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>{t("cancel")}</Button>
        <Button onClick={onClose} variant="contained">
          {t("confirm")}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
