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
import { CostController } from "../services/costController"
import { useLanguageStore } from "../stores/languageStore"
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
  const { t } = useLanguageStore()
  const { expenses, createExpense, updateExpense, deleteExpense } = useExpenses(tripId)
  const { members } = useTripMembers(tripId)

  const costController = useMemo(() => new CostController(trip || ({ id: tripId } as Trip)), [trip, tripId])
  const aggregates = useMemo(
    () => costController.getAggregates({ expenses, transport: trip?.transport }),
    [costController, expenses, trip?.transport],
  )

  const transportExpenses = useMemo(() => {
    if (!trip?.transport || !trip?.activities) return []
    // Get IDs of transports that already have a real expense
    const transportExpenseIds = new Set(expenses.map((e) => e.transportAlternativeId).filter(Boolean))

    return trip.transport
      .filter((t: any) => t.isSelected && (Number(t.cost) || 0) > 0 && !transportExpenseIds.has(t.id))
      .map((t: any) => {
        const fromActivity = trip?.activities?.find((a: any) => a.id === t.fromActivityId)
        const toActivity = trip?.activities?.find((a: any) => a.id === t.toActivityId)
        return {
          id: `virtual-trans-${t.id}`,
          description: `${t.transportMode} to ${toActivity?.name || "Destination"}`,
          amount: Number(t.cost) || 0,
          currency: t.currency || defaultCurrency,
          category: "Transport",
          paymentDate: fromActivity?.scheduledStart || trip.startDate,
          createdAt: new Date().toISOString(),
          tripId: trip.id,
          paidById: t.paidById || "",
          splits: t.splits || [],
          isPaid: false,
          isTransport: true,
          isVirtual: true,
        } as unknown as Expense
      })
  }, [trip, defaultCurrency, expenses])

  const activityExpenses = useMemo(() => {
    if (!trip?.activities) return []
    const expenseActivityIds = new Set(expenses.map((e) => e.activityId).filter(Boolean))

    // Group activities by linkedGroupId to handle costOnceForLinkedGroup
    const seenLinkedGroups = new Set<string>()

    return (trip.activities || [])
      .filter((a) => {
        const hasCost = a.actualCost !== null && a.actualCost !== undefined
        const hasNoExpense = !expenseActivityIds.has(a.id)

        if (!hasCost || !hasNoExpense) return false

        // If it's a linked group and should be paid only once
        if (a.linkedGroupId && a.costOnceForLinkedGroup) {
          if (seenLinkedGroups.has(a.linkedGroupId)) {
            return false // Skip this instance, already counted another one
          }
          seenLinkedGroups.add(a.linkedGroupId)
        }

        return true
      })
      .map(
        (a) =>
          ({
            id: `virtual-act-${a.id}`,
            description: a.name,
            amount: Number(a.actualCost),
            currency: a.currency || defaultCurrency,
            category: a.activityType || "Activity",
            paymentDate: a.scheduledStart || trip.startDate,
            createdAt: new Date().toISOString(),
            tripId: trip.id,
            paidById: a.paidById || "",
            splits: a.expenses && a.expenses.length > 0 ? a.expenses[0].splits : [],
            isPaid: a.isPaid || false,
            isActivityCost: true,
            isVirtual: true,
          }) as unknown as Expense,
      )
  }, [trip, defaultCurrency, expenses])

  const [displayCurrency, setDisplayCurrency] = useState(defaultCurrency)

  const allExpenses = useMemo(() => {
    const selectedTransportIds = new Set((trip?.transport || []).filter((t: any) => t.isSelected).map((t: any) => t.id))
    const filteredDBExpenses = expenses.filter((e) => {
      if (e.transportAlternativeId && !selectedTransportIds.has(e.transportAlternativeId)) {
        return false
      }
      return true
    })
    return [...filteredDBExpenses, ...transportExpenses, ...activityExpenses]
  }, [expenses, transportExpenses, activityExpenses, trip?.transport])

  const totalAmount = aggregates.totalActual

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

  const totalBudget = aggregates.totalBudget
  const remainingBudget = totalBudget - (aggregates.totalExpected || totalAmount)

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
    if ((expense as any).isActivityCost && onEditActivity && trip?.activities) {
      const activityId = expense.id.replace("virtual-act-", "")
      const activity = trip.activities.find((a) => a.id === activityId)
      if (activity) {
        onEditActivity(activity)
        return
      }
    }

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
      setSnackbarMessage(t("deletedSuccessfully"))
      setSnackbarOpen(true)
    }
  }

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <Box
        sx={{
          p: 2,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          bgcolor: "background.paper",
        }}
      >
        <Typography variant="h6">{t("expenses")}</Typography>
        <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
          <TextField
            select
            label={t("currency")}
            value={displayCurrency}
            onChange={(e) => setDisplayCurrency(e.target.value)}
            size="small"
            sx={{ width: 100 }}
          >
            {(currencies || ["AUD"]).map((c) => (
              <MenuItem key={c} value={c}>
                {c}
              </MenuItem>
            ))}
          </TextField>
          <Paper sx={{ p: 1, px: 2, bgcolor: "primary.light", color: "primary.contrastText" }}>
            <Typography variant="caption" display="block">
              Total
            </Typography>
            <Typography variant="h6" sx={{ lineHeight: 1 }}>
              {displayCurrency} {totalAmount.toFixed(2)}
            </Typography>
          </Paper>
        </Box>
      </Box>
      <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
        <Tabs
          value={tabIndex}
          onChange={(_: React.SyntheticEvent, v: number) => {
            setTabIndex(v)
            if (v !== 1) resetForm()
          }}
          centered
        >
          <Tab label={t("allExpenses")} />
          <Tab label={editingExpenseId ? t("editExpense") : t("addExpense")} />
          <Tab label={t("balances")} />
          <Tab label={t("budgetDetails")} />
          <Tab label={t("reports")} />
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
                    {t("totalBudget")}
                  </Typography>
                  <Typography variant="h6">
                    {defaultCurrency} {Number(totalBudget).toFixed(2)}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">
                    {t("totalSpent")}
                  </Typography>
                  <Typography variant="h6" color={remainingBudget < 0 ? "error.main" : "text.primary"}>
                    {defaultCurrency} {Number(totalAmount).toFixed(2)}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">
                    {t("remaining")}
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
                <MenuItem value="All">{t("allCategories")}</MenuItem>
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
                    {t(opt.toLowerCase() as any)}
                  </MenuItem>
                ))}
              </TextField>
            </Box>

            {expenses.length === 0 ? (
              <Box textAlign="center" py={4}>
                <ReceiptLong sx={{ fontSize: 48, color: "text.disabled", mb: 1 }} />
                <Typography color="text.secondary">{t("noExpenses")}</Typography>
                <Button variant="outlined" sx={{ mt: 2 }} onClick={() => setTabIndex(1)}>
                  {t("addFirstExpense")}
                </Button>
              </Box>
            ) : (
              <>
                {/* Paid Expenses Section */}
                <Box mb={3}>
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                    <Typography variant="h6" color="success.main">
                      {t("paidExpenses")}
                    </Typography>
                    <Typography variant="h6" color="success.main">
                      {defaultCurrency}{" "}
                      {filteredExpenses
                        .filter((e) => e.isPaid)
                        .reduce((sum, e) => sum + Number(e.amount), 0)
                        .toFixed(2)}
                    </Typography>
                  </Box>
                  <List>
                    {filteredExpenses
                      .filter((e) => e.isPaid)
                      .map((expense) => {
                        const payer = members.find((m) => m.id === expense.paidById)
                        const isShared =
                          (expense.splits && expense.splits.length > 1) ||
                          (expense as any).isActivityCost ||
                          (expense as any).isTransport

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
                                  <Box textAlign="right">
                                    <Typography fontWeight="bold">
                                      {expense.currency} {Number(expense.amount).toFixed(2)}
                                    </Typography>
                                    {isShared && (
                                      <Typography variant="caption" color="text.secondary">
                                        {expense.splits && expense.splits.length > 0
                                          ? `Split between ${expense.splits.length} people`
                                          : "Shared equally"}
                                      </Typography>
                                    )}
                                  </Box>
                                </Box>
                              }
                              secondary={
                                <Box display="flex" alignItems="center" gap={1} mt={0.5}>
                                  <Chip label={expense.category} size="small" variant="outlined" />
                                  <Typography variant="caption">
                                    {expense.paidById ? `Paid by ${payer ? payer.name : "Someone"}` : "Unpaid"} •{" "}
                                    {dayjs(expense.paymentDate || expense.createdAt).format("MMM D")}
                                  </Typography>
                                </Box>
                              }
                            />
                          </ListItem>
                        )
                      })}
                  </List>
                  {filteredExpenses.filter((e) => e.isPaid).length === 0 && (
                    <Box textAlign="center" py={2}>
                      <Typography color="text.secondary" variant="body2">
                        {t("noExpenses")}
                      </Typography>
                    </Box>
                  )}
                </Box>

                {/* Estimated Expenses Section */}
                <Box mb={3}>
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                    <Typography variant="h6" color="warning.main">
                      {t("estimatedExpenses")}
                    </Typography>
                    <Typography variant="h6" color="warning.main">
                      {defaultCurrency}{" "}
                      {filteredExpenses
                        .filter((e) => !e.isPaid)
                        .reduce((sum, e) => sum + Number(e.amount), 0)
                        .toFixed(2)}
                    </Typography>
                  </Box>
                  <List>
                    {filteredExpenses
                      .filter((e) => !e.isPaid)
                      .map((expense) => {
                        const payer = members.find((m) => m.id === expense.paidById)
                        const isShared =
                          (expense.splits && expense.splits.length > 1) ||
                          (expense as any).isActivityCost ||
                          (expense as any).isTransport

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
                                  <Box textAlign="right">
                                    <Typography fontWeight="bold">
                                      {expense.currency} {Number(expense.amount).toFixed(2)}
                                    </Typography>
                                    {isShared && (
                                      <Typography variant="caption" color="text.secondary">
                                        {expense.splits && expense.splits.length > 0
                                          ? `Split between ${expense.splits.length} people`
                                          : "Shared equally"}
                                      </Typography>
                                    )}
                                  </Box>
                                </Box>
                              }
                              secondary={
                                <Box display="flex" alignItems="center" gap={1} mt={0.5}>
                                  <Chip label={expense.category} size="small" variant="outlined" />
                                  <Typography variant="caption">
                                    {expense.paidById ? `Paid by ${payer ? payer.name : "Someone"}` : "Unpaid"} •{" "}
                                    {dayjs(expense.paymentDate || expense.createdAt).format("MMM D")}
                                  </Typography>
                                </Box>
                              }
                            />
                          </ListItem>
                        )
                      })}
                  </List>
                  {filteredExpenses.filter((e) => !e.isPaid).length === 0 && (
                    <Box textAlign="center" py={2}>
                      <Typography color="text.secondary" variant="body2">
                        {t("noExpenses")}
                      </Typography>
                    </Box>
                  )}
                </Box>

                {/* Combined Total */}
                <Box
                  p={2}
                  bgcolor="primary.main"
                  color="primary.contrastText"
                  borderRadius={1}
                  display="flex"
                  justifyContent="space-between"
                  alignItems="center"
                >
                  <Typography variant="h6">{t("combinedTotal")}</Typography>
                  <Typography variant="h6">
                    {defaultCurrency} {filteredExpenses.reduce((sum, e) => sum + Number(e.amount), 0).toFixed(2)}
                  </Typography>
                </Box>
              </>
            )}
            <Dialog open={!!confirmDeleteId} onClose={() => setConfirmDeleteId(null)}>
              <DialogTitle>{t("confirmDelete")}</DialogTitle>
              <DialogContent>{t("areYouSureDeleteExpense")}</DialogContent>
              <DialogActions>
                <Button onClick={() => setConfirmDeleteId(null)}>{t("cancel")}</Button>
                <Button onClick={handleConfirmDelete} color="error" variant="contained">
                  {t("delete")}
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
              label={t("description")}
              fullWidth
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              autoFocus
            />

            <TextField
              label={`${t("activityNotes")} (${t("optional")})`}
              fullWidth
              multiline
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />

            <Box display="flex" gap={2}>
              <TextField
                label={t("amount")}
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
                label={t("category")}
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
                    {t(opt.toLowerCase() as any)}
                  </MenuItem>
                ))}
              </TextField>
            </Box>

            <TextField
              label={t("paidBy")}
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
                {t("cancel")}
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
                {editingExpenseId ? t("update") : t("save")}
              </Button>
            </Box>
          </Box>
        )}

        {tabIndex === 2 && <ExpenseBalances members={members} expenses={allExpenses} currency={defaultCurrency} />}

        {tabIndex === 3 && (
          <Box>
            <Typography variant="h6" gutterBottom>
              {t("budgetVsActual")}
            </Typography>
            <TableContainer component={Paper} elevation={0} sx={{ border: "1px solid", borderColor: "divider" }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>{t("activities")}</TableCell>
                    <TableCell>{t("category")}</TableCell>
                    <TableCell align="right">{t("estimatedCost")}</TableCell>
                    <TableCell align="right">{t("actualCost")}</TableCell>
                    <TableCell align="right">{t("status")}</TableCell>
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
                          <Chip
                            label={t(activity.activityType as any) || activity.activityType}
                            size="small"
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell align="right">
                          {activity.currency} {Number(activity.estimatedCost || 0).toFixed(2)}
                        </TableCell>
                        <TableCell align="right">
                          {activity.currency} {Number(activity.actualCost || 0).toFixed(2)}
                        </TableCell>
                        <TableCell align="right">
                          <Chip
                            label={
                              activity.isPaid ||
                              (activity.actualCost !== null &&
                                activity.actualCost !== undefined &&
                                Number(activity.actualCost) > 0)
                                ? t("paid")
                                : t("pending")
                            }
                            size="small"
                            color={
                              activity.isPaid ||
                              (activity.actualCost !== null &&
                                activity.actualCost !== undefined &&
                                Number(activity.actualCost) > 0)
                                ? "success"
                                : "warning"
                            }
                          />
                        </TableCell>
                      </TableRow>
                      {/* Transport costs from this activity */}
                      {/* Transport costs from this activity */}
                      {(trip?.transport || [])
                        .filter((trans) => trans.fromActivityId === activity.id && trans.isSelected)
                        .map((trans) => {
                          const expense = allExpenses.find((e) => e.transportAlternativeId === trans.id)
                          const estimatedAmount =
                            trans.estimatedCost !== undefined && trans.estimatedCost !== null
                              ? Number(trans.estimatedCost)
                              : Number(trans.cost || 0)
                          const actualAmount = expense ? Number(expense.amount) : Number(trans.cost || 0)
                          const isPaid = expense ? expense.isPaid : false

                          return (
                            <TableRow key={`transport-${trans.id}`} sx={{ bgcolor: "action.hover" }}>
                              <TableCell sx={{ pl: 4 }}>
                                <Typography variant="body2" color="text.secondary">
                                  ↳ {trans.transportMode} {trans.name ? `(${trans.name})` : ""}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <Chip label={t("transport")} size="small" variant="outlined" color="secondary" />
                              </TableCell>
                              <TableCell align="right">
                                {trans.currency || defaultCurrency} {Number(estimatedAmount).toFixed(2)}
                              </TableCell>
                              <TableCell align="right">
                                {trans.currency || defaultCurrency} {Number(actualAmount).toFixed(2)}
                              </TableCell>
                              <TableCell align="right">
                                <Chip
                                  label={isPaid || Number(actualAmount) > 0 ? t("paid") : t("pending")}
                                  size="small"
                                  color={isPaid || Number(actualAmount) > 0 ? "success" : "warning"}
                                />
                              </TableCell>
                            </TableRow>
                          )
                        })}
                    </Fragment>
                  ))}
                  {/* Subtotals Row */}
                  {(trip?.activities || []).length > 0 && (
                    <TableRow sx={{ bgcolor: "primary.light", fontWeight: "bold" }}>
                      <TableCell colSpan={2} sx={{ fontWeight: "bold" }}>
                        {t("total")}
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: "bold" }}>
                        {defaultCurrency}{" "}
                        {(trip?.activities || [])
                          .reduce((sum, a) => {
                            const estimatedCost = Number(a.estimatedCost || 0)
                            const transportCosts = (trip?.transport || [])
                              .filter((t) => t.fromActivityId === a.id && t.isSelected)
                              .reduce((tSum, t) => {
                                return (
                                  tSum +
                                  Number(
                                    t.estimatedCost !== undefined && t.estimatedCost !== null
                                      ? t.estimatedCost
                                      : t.cost || 0,
                                  )
                                )
                              }, 0)
                            return sum + estimatedCost + transportCosts
                          }, 0)
                          .toFixed(2)}
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: "bold" }}>
                        {defaultCurrency}{" "}
                        {(trip?.activities || [])
                          .reduce((sum, a) => {
                            const actualCost = Number(a.actualCost || 0)
                            const transportCosts = (trip?.transport || [])
                              .filter((t) => t.fromActivityId === a.id && t.isSelected)
                              .reduce((tSum, t) => {
                                const expense = allExpenses.find((e) => e.transportAlternativeId === t.id)
                                return tSum + (expense ? Number(expense.amount) : Number(t.cost || 0))
                              }, 0)
                            return sum + actualCost + transportCosts
                          }, 0)
                          .toFixed(2)}
                      </TableCell>
                      <TableCell />
                    </TableRow>
                  )}
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
            trip={
              {
                ...trip,
                expenses,
                members,
                activities: trip?.activities || [],
                exchangeRates: trip?.exchangeRates || {},
              } as any
            }
            defaultCurrency={defaultCurrency}
            exchangeRates={trip?.exchangeRates}
          />
        )}
      </Box>
    </Box>
  )
}
