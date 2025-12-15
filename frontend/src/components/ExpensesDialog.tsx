import { useState } from "react"
import {
  Dialog,
  DialogTitle,
  DialogContent,
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
} from "@mui/material"
import { Close as CloseIcon, Delete as DeleteIcon, ReceiptLong } from "@mui/icons-material"
import { useExpenses } from "../hooks/useExpenses"
import { useTripMembers } from "../hooks/useTripMembers"
import { DatePicker } from "@mui/x-date-pickers/DatePicker"
import dayjs, { Dayjs } from "dayjs"

interface ExpensesDialogProps {
  open: boolean
  onClose: () => void
  tripId: string
  currency?: string
}

export const ExpensesDialog = ({ open, onClose, tripId, currency = "AUD" }: ExpensesDialogProps) => {
  const { expenses, createExpense, deleteExpense, totalAmount } = useExpenses(tripId)
  const { members } = useTripMembers(tripId)

  const [tabIndex, setTabIndex] = useState(0)

  // Form State
  const [description, setDescription] = useState("")
  const [amount, setAmount] = useState("")
  const [category, setCategory] = useState("Food")
  const [paidById, setPaidById] = useState("")
  const [date, setDate] = useState<Dayjs | null>(dayjs())

  const handleSave = async () => {
    if (!description || !amount || parseFloat(amount) <= 0) return

    await createExpense.mutateAsync({
      tripId,
      description,
      amount: parseFloat(amount),
      currency,
      category,
      paidById: paidById || undefined,
      date: date?.toISOString(),
      isPaid: true,
      splitType: "equal", // Default for now
      // splits: [] // Backend handles defaults
    })

    // Reset form
    setDescription("")
    setAmount("")
    setCategory("Food")
    // setPaidById("") // Keep last payer often useful?
    setDate(dayjs())

    setTabIndex(0) // Go back to list
  }

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (confirm("Are you sure you want to delete this expense?")) {
      await deleteExpense.mutateAsync(id)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          Expenses
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
        <Tabs value={tabIndex} onChange={(_: React.SyntheticEvent, v: number) => setTabIndex(v)} centered>
          <Tab label="All Expenses" />
          <Tab label="Add New" />
        </Tabs>
      </Box>

      <DialogContent>
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
              <Typography variant="subtitle1">Total Spent</Typography>
              <Typography variant="h4">
                {currency} {totalAmount.toFixed(2)}
              </Typography>
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
                {expenses.map((expense) => {
                  const payer = members.find((m) => m.id === expense.paidById)
                  return (
                    <ListItem
                      key={expense.id}
                      secondaryAction={
                        <IconButton edge="end" onClick={(e: React.MouseEvent) => handleDelete(expense.id, e)}>
                          <DeleteIcon />
                        </IconButton>
                      }
                      sx={{ borderBottom: "1px solid #eee" }}
                    >
                      <ListItemText
                        primary={
                          <Box display="flex" justifyContent="space-between" pr={4}>
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

            <Box display="flex" gap={2}>
              <TextField
                label="Amount"
                type="number"
                fullWidth
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                InputProps={{
                  startAdornment: <InputAdornment position="start">{currency}</InputAdornment>,
                }}
              />
              <TextField
                label="Category"
                select
                fullWidth
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                {["Food", "Transport", "Accommodation", "Activities", "Shopping", "Other"].map((opt) => (
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

            <Box mt={2} display="flex" justifyContent="flex-end" gap={1}>
              <Button onClick={() => setTabIndex(0)}>Cancel</Button>
              <Button
                variant="contained"
                onClick={handleSave}
                disabled={!description || !amount || !paidById || createExpense.isPending}
              >
                Save Expense
              </Button>
            </Box>
          </Box>
        )}
      </DialogContent>
    </Dialog>
  )
}
