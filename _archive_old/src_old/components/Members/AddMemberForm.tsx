import {
  Box,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
  SelectChangeEvent,
} from "@mui/material"
import axios from "axios"
import React, { useState } from "react"

interface AddMemberFormProps {
  tripId: string
  onSuccess: () => void
  onCancel: () => void
}

const AddMemberForm: React.FC<AddMemberFormProps> = ({ tripId, onSuccess, onCancel }) => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    role: "viewer",
  })
  const [submitting, setSubmitting] = useState(false)

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
      await axios.post(`/api/trips/${tripId}/members`, formData)
      onSuccess()
    } catch (err) {
      console.error("Error adding member:", err)
      alert("Failed to add member")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1 }}>
      <Stack spacing={2}>
        <TextField name="name" label="Name" value={formData.name} onChange={handleTextChange} fullWidth required />
        <TextField
          name="email"
          label="Email (optional)"
          type="email"
          value={formData.email}
          onChange={handleTextChange}
          fullWidth
        />
        <FormControl fullWidth>
          <InputLabel>Role</InputLabel>
          <Select name="role" value={formData.role} label="Role" onChange={handleSelectChange}>
            <MenuItem value="viewer">Viewer</MenuItem>
            <MenuItem value="editor">Editor</MenuItem>
            <MenuItem value="owner">Owner</MenuItem>
          </Select>
        </FormControl>
        <Stack direction="row" spacing={2} justifyContent="flex-end">
          <Button onClick={onCancel} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" variant="contained" disabled={submitting}>
            {submitting ? "Adding..." : "Add Member"}
          </Button>
        </Stack>
      </Stack>
    </Box>
  )
}

export default AddMemberForm
