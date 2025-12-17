import { Delete, Edit, PersonAdd } from "@mui/icons-material"
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
  Box,
  Typography,
  IconButton,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
  Alert,
  CircularProgress,
  Chip,
} from "@mui/material"
import { useState } from "react"

import { useTripMembers } from "../hooks/useTripMembers"
import { MemberRole } from "../types"
import type { Trip } from "../types"

interface TripMembersDialogProps {
  open: boolean
  onClose: () => void
  trip: Trip
  fullScreen?: boolean
}

const PRESET_COLORS = [
  "#f44336", // Red
  "#e91e63", // Pink
  "#9c27b0", // Purple
  "#673ab7", // Deep Purple
  "#3f51b5", // Indigo
  "#2196f3", // Blue
  "#03a9f4", // Light Blue
  "#00bcd4", // Cyan
  "#009688", // Teal
  "#4caf50", // Green
  "#8bc34a", // Light Green
  "#cddc39", // Lime
  "#ffeb3b", // Yellow
  "#ffc107", // Amber
  "#ff9800", // Orange
  "#ff5722", // Deep Orange
  "#795548", // Brown
  "#9e9e9e", // Grey
  "#607d8b", // Blue Grey
]

export const TripMembersDialog = ({ open, onClose, trip, fullScreen }: TripMembersDialogProps) => {
  const { members, isLoading, addMember, updateMember, removeMember, isAddingMember } = useTripMembers(trip.id)

  const [newMemberName, setNewMemberName] = useState("")
  const [newMemberEmail, setNewMemberEmail] = useState("")
  const [newMemberRole, setNewMemberRole] = useState<MemberRole>(MemberRole.VIEWER)
  const [newMemberColor, setNewMemberColor] = useState(PRESET_COLORS[0])

  const [editingId, setEditingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleAddMember = async () => {
    if (!newMemberName.trim()) return

    try {
      setError(null)
      await addMember({
        name: newMemberName,
        email: newMemberEmail || undefined,
        role: newMemberRole,
        color: newMemberColor,
      })

      // Reset form
      setNewMemberName("")
      setNewMemberEmail("")
      setNewMemberRole(MemberRole.VIEWER)
      setNewMemberColor(PRESET_COLORS[Math.floor(Math.random() * PRESET_COLORS.length)])
    } catch (err: unknown) {
      setError((err as any)?.response?.data?.error?.message || "Failed to add member")
    }
  }

  const handleUpdateMember = async (memberId: string, data: { role?: MemberRole; color?: string }) => {
    try {
      setError(null)
      await updateMember({
        id: memberId,
        data,
      })
      // Only exit edit mode if we're not just clicking a color
      // setEditingId(null)
      // Better to keep editing until they click check or x?
      // The previous UI autosaved on role change.
      // If I add color picker, autosaving on click is fine.
      if (data.role) {
        // If role changed, maybe we can assume they're done? No, let's keep it open or close it?
        // Let's keep autosave behavior for now, but maybe don't close until X is clicked if we want to change both?
        // Actually for a simple UI, selecting a color should just update it.
      }
    } catch {
      setError("Failed to update member")
    }
  }

  const handleRemoveMember = async (memberId: string) => {
    if (window.confirm("Are you sure you want to remove this member?")) {
      try {
        setError(null)
        await removeMember(memberId)
      } catch {
        setError("Failed to remove member")
      }
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth fullScreen={fullScreen}>
      <DialogTitle>Manage Trip Members</DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* Add New Member Form */}
        <Box sx={{ mb: 4, p: 2, bgcolor: "background.default", borderRadius: 1 }}>
          <Typography variant="subtitle2" gutterBottom>
            Add New Member
          </Typography>
          <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
            <TextField
              fullWidth
              size="small"
              label="Name"
              value={newMemberName}
              onChange={(e) => setNewMemberName(e.target.value)}
            />
            <TextField
              fullWidth
              size="small"
              label="Email (Optional)"
              value={newMemberEmail}
              onChange={(e) => setNewMemberEmail(e.target.value)}
            />
          </Box>
          <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
            <TextField
              select
              size="small"
              label="Role"
              value={newMemberRole}
              onChange={(e) => setNewMemberRole(e.target.value as MemberRole)}
              sx={{ minWidth: 120 }}
            >
              <MenuItem value={MemberRole.OWNER}>Owner</MenuItem>
              <MenuItem value={MemberRole.EDITOR}>Editor</MenuItem>
              <MenuItem value={MemberRole.VIEWER}>Viewer</MenuItem>
            </TextField>

            <Box sx={{ display: "flex", gap: 0.5 }}>
              {PRESET_COLORS.slice(0, 10).map((color) => (
                <Box
                  key={color}
                  onClick={() => setNewMemberColor(color)}
                  sx={{
                    width: 24,
                    height: 24,
                    borderRadius: "50%",
                    bgcolor: color,
                    cursor: "pointer",
                    border: newMemberColor === color ? "2px solid black" : "none",
                  }}
                />
              ))}
            </Box>

            <Button
              variant="contained"
              startIcon={isAddingMember ? <CircularProgress size={20} /> : <PersonAdd />}
              onClick={handleAddMember}
              disabled={!newMemberName || isAddingMember}
              sx={{ ml: "auto" }}
            >
              Add
            </Button>
          </Box>
        </Box>

        {/* Members List */}
        <Typography variant="subtitle2" gutterBottom>
          Current Members ({members?.length || 0})
        </Typography>
        {isLoading ? (
          <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <List>
            {members?.map((member) => (
              <ListItem key={member.id} divider>
                <ListItemAvatar>
                  <Avatar sx={{ bgcolor: member.color }}>{member.name.charAt(0)}</Avatar>
                </ListItemAvatar>
                <ListItemText primary={member.name} secondary={member.email || "No email"} />

                {editingId === member.id ? (
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Box sx={{ display: "flex", gap: 0.5 }}>
                      {PRESET_COLORS.slice(0, 10).map((color) => (
                        <Box
                          key={color}
                          onClick={() => handleUpdateMember(member.id, { color })}
                          sx={{
                            width: 20,
                            height: 20,
                            borderRadius: "50%",
                            bgcolor: color,
                            cursor: "pointer",
                            border: member.color === color ? "2px solid black" : "1px solid #ddd",
                          }}
                        />
                      ))}
                    </Box>
                    <TextField
                      select
                      size="small"
                      value={member.role}
                      onChange={(e) => handleUpdateMember(member.id, { role: e.target.value as MemberRole })}
                      sx={{ width: 100 }}
                    >
                      <MenuItem value={MemberRole.OWNER}>Owner</MenuItem>
                      <MenuItem value={MemberRole.EDITOR}>Editor</MenuItem>
                      <MenuItem value={MemberRole.VIEWER}>Viewer</MenuItem>
                    </TextField>
                    <IconButton size="small" onClick={() => setEditingId(null)}>
                      <Typography variant="caption">Done</Typography>
                    </IconButton>
                  </Box>
                ) : (
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Chip
                      label={member.role}
                      size="small"
                      color={
                        member.role === MemberRole.OWNER
                          ? "error"
                          : member.role === MemberRole.EDITOR
                            ? "primary"
                            : "default"
                      }
                      variant="outlined"
                    />
                    <IconButton size="small" onClick={() => setEditingId(member.id)}>
                      <Edit fontSize="small" />
                    </IconButton>
                    <IconButton size="small" onClick={() => handleRemoveMember(member.id)}>
                      <Delete fontSize="small" />
                    </IconButton>
                  </Box>
                )}
              </ListItem>
            ))}
            {members?.length === 0 && (
              <Typography color="text.secondary" align="center" sx={{ py: 4 }}>
                No members yet
              </Typography>
            )}
          </List>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  )
}
