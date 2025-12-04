import {
  Box,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
  Typography,
  InputAdornment,
  SelectChangeEvent,
} from "@mui/material"
import axios from "axios"
import React, { useState, useEffect, useCallback } from "react"

import { TripMember } from "../../types/members"

import ExpenseSplitter from "./ExpenseSplitter"

interface AddExpenseFormProps {
  tripId: string
  onSuccess: () => void
  onCancel: () => void
}

const AddExpenseForm: React.FC<AddExpenseFormProps> = ({ tripId, onSuccess, onCancel }) => {
  const [members, setMembers] = useState<TripMember[]>([])
  const [formData, setFormData] = useState({
    description: "",
    amount: "",
    currency: "AUD",
    paid_by_id: "",
    category: "food",
    date: new Date().toISOString().split("T")[0],
    notes: "",
  })
  const [splitType, setSplitType] = useState<"equal" | "percentage" | "exact">("equal")
  const [splits, setSplits] = useState<{ member_id: string; value: number }[]>([])
  const [submitting, setSubmitting] = useState(false)

  const fetchMembers = useCallback(async () => {
    try {
      const response = await axios.get(`/api/trips/${tripId}/members`)
      setMembers(response.data)
      if (response.data.length > 0) {
        setFormData((prev) => ({ ...prev, paid_by_id: response.data[0].id }))
      }
    } catch (err) {
      console.error("Error fetching members:", err)
    }
  }, [tripId])

  useEffect(() => {
    fetchMembers()
  }, [fetchMembers])

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSelectChange = (e: SelectChangeEvent) => {
    const name = e.target.name as string
    const value = e.target.value
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await axios.post(`/api/trips/${tripId}/expenses`, {
        ...formData,
        amount: parseFloat(formData.amount),
        split_type: splitType,
        splits,
      })
      onSuccess()
    } catch (err) {
      console.error("Error adding expense:", err)
      alert("Failed to add expense")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1 }}>
      <Stack spacing={2}>
        <TextField
          name="description"
          label="Description"
          value={formData.description}
          onChange={handleTextChange}
          fullWidth
          required
        />

        <Stack direction="row" spacing={2}>
          <TextField
            name="amount"
            label="Amount"
            type="number"
            value={formData.amount}
            onChange={handleTextChange}
            fullWidth
            required
            InputProps={{
              startAdornment: <InputAdornment position="start">$</InputAdornment>,
            }}
          />
          <TextField
            name="currency"
            label="Currency"
            value={formData.currency}
            onChange={handleTextChange}
            sx={{ width: 100 }}
          />
        </Stack>

        <FormControl fullWidth>
          <InputLabel>Paid By</InputLabel>
          <Select name="paid_by_id" value={formData.paid_by_id} label="Paid By" onChange={handleSelectChange} required>
            {members.map((member) => (
              <MenuItem key={member.id} value={member.id}>
                {member.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl fullWidth>
          <InputLabel>Category</InputLabel>
          <Select name="category" value={formData.category} label="Category" onChange={handleSelectChange}>
            <MenuItem value="food">Food</MenuItem>
            <MenuItem value="accommodation">Accommodation</MenuItem>
            <MenuItem value="transport">Transport</MenuItem>
            <MenuItem value="activities">Activities</MenuItem>
            <MenuItem value="shopping">Shopping</MenuItem>
            <MenuItem value="other">Other</MenuItem>
          </Select>
        </FormControl>

        <TextField
          name="date"
          label="Date"
          type="date"
          value={formData.date}
          onChange={handleTextChange}
          fullWidth
          InputLabelProps={{ shrink: true }}
        />

        <TextField
          name="notes"
          label="Notes (optional)"
          value={formData.notes}
          onChange={handleTextChange}
          fullWidth
          multiline
          rows={2}
        />

        <Typography variant="subtitle2" sx={{ mt: 2 }}>
          Split Between
        </Typography>

        <ExpenseSplitter
          members={members}
          amount={parseFloat(formData.amount) || 0}
          splitType={splitType}
          onSplitTypeChange={setSplitType}
          onSplitsChange={setSplits}
        />

        <Stack direction="row" spacing={2} justifyContent="flex-end" sx={{ mt: 2 }}>
          <Button onClick={onCancel} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" variant="contained" disabled={submitting}>
            {submitting ? "Adding..." : "Add Expense"}
          </Button>
        </Stack>
      </Stack>
    </Box>
  )
}

export default AddExpenseForm
