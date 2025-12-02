import AddIcon from "@mui/icons-material/Add"
import DeleteIcon from "@mui/icons-material/Delete"
import {
  List,
  ListItem,
  ListItemText,
  Typography,
  Box,
  Button,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  Divider,
} from "@mui/material"
import axios from "axios"
import React, { useState, useEffect, useCallback } from "react"

import { Expense } from "../../types/expenses"

import AddExpenseForm from "./AddExpenseForm"

interface ExpensesListProps {
  tripId: string
}

const ExpensesList: React.FC<ExpensesListProps> = ({ tripId }) => {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [openAdd, setOpenAdd] = useState(false)

  const fetchExpenses = useCallback(async () => {
    try {
      const response = await axios.get(`/api/trips/${tripId}/expenses`)
      setExpenses(response.data)
    } catch (err) {
      console.error("Error fetching expenses:", err)
    }
  }, [tripId])

  useEffect(() => {
    fetchExpenses()
  }, [fetchExpenses])

  const handleDelete = async (expenseId: string) => {
    if (!window.confirm("Are you sure you want to delete this expense?")) return
    try {
      await axios.delete(`/api/expenses/${expenseId}`)
      fetchExpenses()
    } catch (err) {
      console.error("Error deleting expense:", err)
    }
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString()
  }

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
        <Typography variant="h6">Expenses</Typography>
        <Button startIcon={<AddIcon />} variant="contained" size="small" onClick={() => setOpenAdd(true)}>
          Add Expense
        </Button>
      </Box>

      <List>
        {expenses.map((expense) => (
          <React.Fragment key={expense.id}>
            <ListItem
              secondaryAction={
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Typography variant="h6" color="primary">
                    {expense.currency} {expense.amount.toFixed(2)}
                  </Typography>
                  <IconButton edge="end" onClick={() => handleDelete(expense.id)}>
                    <DeleteIcon />
                  </IconButton>
                </Box>
              }
            >
              <ListItemText
                primary={
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Typography variant="subtitle1">{expense.description}</Typography>
                    <Chip label={expense.category} size="small" variant="outlined" />
                  </Box>
                }
                secondary={
                  <React.Fragment>
                    <Typography component="span" variant="body2" color="text.secondary">
                      {formatDate(expense.date)} • Split among {expense.splits.length} members
                    </Typography>
                  </React.Fragment>
                }
              />
            </ListItem>
            <Divider />
          </React.Fragment>
        ))}
      </List>

      <Dialog open={openAdd} onClose={() => setOpenAdd(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add New Expense</DialogTitle>
        <DialogContent>
          <AddExpenseForm
            tripId={tripId}
            onSuccess={() => {
              setOpenAdd(false)
              fetchExpenses()
            }}
            onCancel={() => setOpenAdd(false)}
          />
        </DialogContent>
      </Dialog>
    </Box>
  )
}

export default ExpensesList
