import { Delete as DeleteIcon, Edit as EditIcon, ReceiptLong } from "@mui/icons-material"
import {
  Button,
  List,
  ListItem,
  ListItemText,
  Typography,
  Box,
  TextField,
  MenuItem,
  InputAdornment,
  IconButton,
  Tabs,
  Tab,
  Avatar,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
} from "@mui/material"
import { DatePicker } from "@mui/x-date-pickers/DatePicker"
import dayjs, { Dayjs } from "dayjs"
import { useState, useMemo, Fragment } from "react"

import { useExpenses } from "../hooks/useExpenses"
import { useTripMembers } from "../hooks/useTripMembers"
import type { Trip, Expense, Activity } from "../types"

import { ExpenseBalances } from "./ExpenseBalances"
import { ExpenseReports } from "./ExpenseReports"
import { ExpenseSplitInput, type ExpenseSplit, type SplitType } from "./ExpenseSplitInput"

interface ExpensesPanelProps {
  tripId: string
  defaultCurrency?: string
  currencies?: string[]
  trip?: Trip
  onEditActivity?: (activity: Activity) => void
}

export const ExpensesPanel = ({
  tripId,
  defaultCurrency = "AUD",
  currencies = ["AUD"],
  trip,
  onEditActivity,
}: ExpensesPanelProps) => {
  const { expenses, createExpense, updateExpense, deleteExpense } = useExpenses(tripId)
  const { members } = useTripMembers(tripId)

  const transportExpenses = useMemo(() => {
    if (!trip?.transport || !trip?.activities) return []
    // Get IDs of transports that already have a real expense
    const transportExpenseIds = new Set(expenses.map((e) => e.transportAlternativeId).filter(Boolean))

    return trip.transport
      .filter((t: any) => t.isSelected && t.cost && t.cost > 0 && !transportExpenseIds.has(t.id))
      .map((t: any) => {
        const fromActivity = trip?.activities?.find((a: any) => a.id === t.fromActivityId)
        const toActivity = trip?.activities?.find((a: any) => a.id === t.toActivityId)
        return {
          id: t.id,
          description: `${t.transportMode} to ${toActivity?.name || "Destination"}`,
          amount: t.cost || 0,
          currency: t.currency || defaultCurrency,
          category: "Transport",
          paymentDate: fromActivity?.scheduledStart || trip.startDate,
          createdAt: new Date().toISOString(),
          tripId: trip.id,
          paidById: "",
          splits: [],
          isTransport: true,
        } as unknown as Expense
      })
  }, [trip, defaultCurrency, expenses])

  const allExpenses = useMemo(() => [...expenses, ...transportExpenses], [expenses, transportExpenses])
  const totalAmount = allExpenses.reduce((sum, e) => sum + Number(e.amount), 0)

  const [tabIndex, setTabIndex] = useState(0)

  // Form State
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null)
  const [description, setDescription] = useState("")
  const [notes, setNotes] = useState("")
  const [amount, setAmount] = useState("")
  const [currency, setCurrency] = useState(defaultCurrency)
  const [category, setCategory] = useState("Food")
  const [paidById, setPaidById] = useState("")
  const [date, setDate] = useState<Dayjs | null>(dayjs())
  const [selectedCategory, setSelectedCategory] = useState("All")

  const filteredExpenses =
    selectedCategory === "All" ? allExpenses : allExpenses.filter((e) => e.category === selectedCategory)

  const totalBudget = trip?.budget || 0
  const remainingBudget = totalBudget - totalAmount

  // Split State
  const [splitType, setSplitType] = useState<SplitType>("equal")
  const [splits, setSplits] = useState<ExpenseSplit[]>([])

  const handleSave = async () => {
    if (!description || !amount || parseFloat(amount) <= 0) return

    const payload = {
      description,
      notes,
      amount: parseFloat(amount),
      currency,
      category,
      paidById: paidById || undefined,
      date: date?.toISOString(),
      isPaid: true,
      splitType,
      splits: splits.map((s) => ({
        memberId: s.memberId,
        amount: s.amount,
      })),
    }

    if (editingExpenseId) {
      await updateExpense.mutateAsync({
        id: editingExpenseId,
        ...payload,
      })
    } else {
      await createExpense.mutateAsync({
        tripId,
        ...payload,
      })
    }

    resetForm()
    setTabIndex(0) // Go back to list
  }

  const resetForm = () => {
    setEditingExpenseId(null)
    setDescription("")
    setNotes("")
    setAmount("")
    setCategory("Food")
    setDate(dayjs())
    setSplitType("equal")
    setSplits([])
  }

  const handleEdit = (expense: Expense) => {
    setEditingExpenseId(expense.id)
    setDescription(expense.description)
    setNotes(expense.notes || "")
    setAmount(expense.amount.toString())
    setCurrency(expense.currency)
    setCategory(expense.category)
    setPaidById(expense.paidById || "")
    setDate(dayjs(expense.paymentDate || expense.createdAt))
    setSplitType(expense.splitType as SplitType)
    setSplits(
      (expense.splits || []).map((s) => ({
        memberId: s.memberId,
        amount: s.amount,
        percentage: s.percentage,
      })),
    )

    setTabIndex(1) // Go to Add/Edit tab
  }

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [snackbarOpen, setSnackbarOpen] = useState(false)
  const [snackbarMessage, setSnackbarMessage] = useState("")

  const handleDeleteClick = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setConfirmDeleteId(id)
  }

  const handleConfirmDelete = async () => {
    if (confirmDeleteId) {
      await deleteExpense.mutateAsync(confirmDeleteId)
      setConfirmDeleteId(null)
      setSnackbarMessage("Expense deleted successfully")
      setSnackbarOpen(true)
    }
  }

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
        <Tabs
          value={tabIndex}
          onChange={(_: React.SyntheticEvent, v: number) => {
            setTabIndex(v)
            if (v !== 1) resetForm()
          }}
          centered
        >
          <Tab label="All Expenses" />
          <Tab label={editingExpenseId ? "Edit Expense" : "Add New"} />
          <Tab label="Balances" />
          <Tab label="Budget Details" />
          <Tab label="Reports" />
        </Tabs>
      </Box>

      <Box sx={{ p: 2, flexGrow: 1, overflow: "auto" }}>
        {tabIndex === 0 && (
          <Box>
            <Box
              mb={2}
              display="flex"
              justifyContent="space-between"
              alignItems="center"
              p={2}
              bgcolor="primary.light"
              borderRadius={1}
              color="primary.contrastText"
            >
              <Box display="flex" gap={4}>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">
                    Total Budget
                  </Typography>
                  <Typography variant="h6">
                    {defaultCurrency} {Number(totalBudget).toFixed(2)}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">
                    Total Spent
                  </Typography>
                  <Typography variant="h6" color={remainingBudget < 0 ? "error.main" : "text.primary"}>
                    {defaultCurrency} {Number(totalAmount).toFixed(2)}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">
                    Remaining
                  </Typography>
                  <Typography variant="h6" color={remainingBudget < 0 ? "error.main" : "success.main"}>
                    {defaultCurrency} {remainingBudget.toFixed(2)}
                  </Typography>
                </Box>
              </Box>
            </Box>

            <Box px={2} mb={2}>
              <TextField
                select
                label="Filter by Category"
                size="small"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                sx={{ minWidth: 200 }}
              >
                <MenuItem value="All">All Categories</MenuItem>
                {[
                  "Food",
                  "Transport",
                  "Accommodation",
                  "Activities",
                  "Shopping",
                  "Flights",
                  "Souvenirs",
                  "Clothes",
                  "Groceries",
                  "Other",
                ].map((opt) => (
                  <MenuItem key={opt} value={opt}>
                    {opt}
                  </MenuItem>
                ))}
              </TextField>
            </Box>

            {expenses.length === 0 ? (
              <Box textAlign="center" py={4}>
                <ReceiptLong sx={{ fontSize: 48, color: "text.disabled", mb: 1 }} />
                <Typography color="text.secondary">No expenses recorded yet.</Typography>
                <Button variant="outlined" sx={{ mt: 2 }} onClick={() => setTabIndex(1)}>
                  Add First Expense
                </Button>
              </Box>
            ) : (
              <List>
                {filteredExpenses.map((expense) => {
                  const payer = members.find((m) => m.id === expense.paidById)
                  return (
                    <ListItem
                      key={expense.id}
                      secondaryAction={
                        <Box>
                          {!(expense as any).isTransport && (
                            <>
                              <IconButton edge="end" onClick={() => handleEdit(expense)} sx={{ mr: 1 }}>
                                <EditIcon />
                              </IconButton>
                              <IconButton
                                edge="end"
                                onClick={(e: React.MouseEvent) => handleDeleteClick(expense.id, e)}
                              >
                                <DeleteIcon />
                              </IconButton>
                            </>
                          )}
                        </Box>
                      }
                      sx={{ borderBottom: "1px solid #eee" }}
                    >
                      <ListItemText
                        primary={
                          <Box display="flex" justifyContent="space-between" pr={6}>
                            <Typography fontWeight="medium">{expense.description}</Typography>
                            <Typography fontWeight="bold">
                              {expense.currency} {Number(expense.amount).toFixed(2)}
                            </Typography>
                          </Box>
                        }
                        secondary={
                          <Box display="flex" alignItems="center" gap={1} mt={0.5}>
                            <Chip label={expense.category} size="small" variant="outlined" />
                            <Typography variant="caption">
                              Paid by {payer ? payer.name : "Someone"} •{" "}
                              {dayjs(expense.paymentDate || expense.createdAt).format("MMM D")}
                            </Typography>
                          </Box>
                        }
                      />
                    </ListItem>
                  )
                })}
              </List>
            )}
            <Dialog open={!!confirmDeleteId} onClose={() => setConfirmDeleteId(null)}>
              <DialogTitle>Confirm Delete</DialogTitle>
              <DialogContent>Are you sure you want to delete this expense?</DialogContent>
              <DialogActions>
                <Button onClick={() => setConfirmDeleteId(null)}>Cancel</Button>
                <Button onClick={handleConfirmDelete} color="error" variant="contained">
                  Delete
                </Button>
              </DialogActions>
            </Dialog>
            <Snackbar
              open={snackbarOpen}
              autoHideDuration={6000}
              onClose={() => setSnackbarOpen(false)}
              message={snackbarMessage}
            />
          </Box>
        )}

        {tabIndex === 1 && (
          <Box pt={2} display="flex" flexDirection="column" gap={2}>
            <TextField
              label="Description"
              fullWidth
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              autoFocus
            />

            <TextField
              label="Notes (Optional)"
              fullWidth
              multiline
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />

            <Box display="flex" gap={2}>
              <TextField
                label="Amount"
                type="number"
                fullWidth
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <TextField
                        select
                        variant="standard"
                        value={currency}
                        onChange={(e) => setCurrency(e.target.value)}
                        InputProps={{ disableUnderline: true }}
                        sx={{ width: 60 }}
                      >
                        {currencies.map((curr) => (
                          <MenuItem key={curr} value={curr}>
                            {curr}
                          </MenuItem>
                        ))}
                      </TextField>
                    </InputAdornment>
                  ),
                }}
              />
              <TextField
                label="Category"
                select
                fullWidth
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                {[
                  "Food",
                  "Transport",
                  "Accommodation",
                  "Activities",
                  "Shopping",
                  "Flights",
                  "Souvenirs",
                  "Clothes",
                  "Groceries",
                  "Other",
                ].map((opt) => (
                  <MenuItem key={opt} value={opt}>
                    {opt}
                  </MenuItem>
                ))}
              </TextField>
            </Box>

            <TextField
              label="Paid By"
              select
              fullWidth
              value={paidById}
              onChange={(e) => setPaidById(e.target.value)}
              helperText="Select who paid for this"
            >
              {members.map((m) => (
                <MenuItem key={m.id} value={m.id}>
                  <Box display="flex" alignItems="center" gap={1}>
                    <Avatar sx={{ width: 24, height: 24, bgcolor: m.color, fontSize: "0.75rem" }}>
                      {m.name.charAt(0)}
                    </Avatar>
                    {m.name}
                  </Box>
                </MenuItem>
              ))}
            </TextField>

            <DatePicker
              label="Date"
              value={date}
              onChange={(newValue) => setDate(newValue)}
              slotProps={{ textField: { fullWidth: true } }}
            />

            <ExpenseSplitInput
              members={members}
              totalAmount={parseFloat(amount) || 0}
              currency={currency}
              value={splits}
              splitType={splitType}
              onChange={(newSplits, newType) => {
                setSplits(newSplits)
                if (newType !== splitType) setSplitType(newType)
              }}
            />

            <Box mt={2} display="flex" justifyContent="flex-end" gap={1}>
              <Button
                onClick={() => {
                  resetForm()
                  setTabIndex(0)
                }}
              >
                Cancel
              </Button>
              <Button
                variant="contained"
                onClick={handleSave}
                disabled={
                  !description ||
                  !amount ||
                  createExpense.isPending ||
                  updateExpense.isPending ||
                  (splitType !== "equal" &&
                    Math.abs(splits.reduce((sum, s) => sum + (s.amount || 0), 0) - (parseFloat(amount) || 0)) > 0.1)
                }
              >
                {editingExpenseId ? "Update Expense" : "Save Expense"}
              </Button>
            </Box>
          </Box>
        )}

        {tabIndex === 2 && <ExpenseBalances members={members} expenses={allExpenses} currency={defaultCurrency} />}

        {tabIndex === 3 && (
          <Box>
            <Typography variant="h6" gutterBottom>
              Budget vs. Actual by Activity
            </Typography>
            <TableContainer component={Paper} elevation={0} sx={{ border: "1px solid", borderColor: "divider" }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Activity</TableCell>
                    <TableCell>Category</TableCell>
                    <TableCell align="right">Estimated</TableCell>
                    <TableCell align="right">Actual</TableCell>
                    <TableCell align="right">Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(trip?.activities || []).map((activity) => (
                    <Fragment key={activity.id}>
                      <TableRow>
                        <TableCell>
                          <Box display="flex" alignItems="center" gap={1}>
                            {activity.name}
                            {onEditActivity && (
                              <IconButton size="small" onClick={() => onEditActivity(activity)}>
                                <EditIcon fontSize="small" />
                              </IconButton>
                            )}
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Chip label={activity.activityType} size="small" variant="outlined" />
                        </TableCell>
                        <TableCell align="right">
                          {activity.currency} {Number(activity.estimatedCost || 0).toFixed(2)}
                        </TableCell>
                        <TableCell align="right">
                          {activity.currency} {Number(activity.actualCost || 0).toFixed(2)}
                        </TableCell>
                        <TableCell align="right">
                          <Chip
                            label={activity.isPaid ? "Paid" : "Pending"}
                            size="small"
                            color={activity.isPaid ? "success" : "warning"}
                          />
                        </TableCell>
                      </TableRow>
                      {/* Transport costs from this activity */}
                      {transportExpenses
                        .filter((t) => {
                          // Match transports that start from this activity
                          const matchingTransport = trip?.transport?.find(
                            (tr) => tr.fromActivityId === activity.id && tr.isSelected,
                          )
                          return matchingTransport && t.description.includes(matchingTransport.transportMode)
                        })
                        .map((transport) => (
                          <TableRow key={`transport-${transport.id}`} sx={{ bgcolor: "action.hover" }}>
                            <TableCell sx={{ pl: 4 }}>
                              <Typography variant="body2" color="text.secondary">
                                ↳ {transport.description}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Chip label="Transport" size="small" variant="outlined" color="secondary" />
                            </TableCell>
                            <TableCell align="right">
                              {transport.currency} {Number(transport.amount || 0).toFixed(2)}
                            </TableCell>
                            <TableCell align="right">
                              {transport.currency} {Number(transport.amount || 0).toFixed(2)}
                            </TableCell>
                            <TableCell align="right">
                              <Chip label="Paid" size="small" color="success" />
                            </TableCell>
                          </TableRow>
                        ))}
                    </Fragment>
                  ))}
                  {(trip?.activities || []).length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} align="center">
                        No activities with costs found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}

        {tabIndex === 4 && (
          <ExpenseReports
            members={members}
            expenses={expenses}
            activities={trip?.activities || []}
            defaultCurrency={defaultCurrency}
            exchangeRates={trip?.exchangeRates}
          />
        )}
      </Box>
    </Box>
  )
}
