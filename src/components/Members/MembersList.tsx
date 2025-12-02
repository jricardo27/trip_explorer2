import DeleteIcon from "@mui/icons-material/Delete"
import PersonAddIcon from "@mui/icons-material/PersonAdd"
import {
  List,
  ListItem,
  ListItemAvatar,
  Avatar,
  ListItemText,
  IconButton,
  Typography,
  Chip,
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
} from "@mui/material"
import axios from "axios"
import React, { useState, useEffect, useCallback } from "react"

import { TripMember } from "../../types/members"

import AddMemberForm from "./AddMemberForm"

interface MembersListProps {
  tripId: string
}

const MembersList: React.FC<MembersListProps> = ({ tripId }) => {
  const [members, setMembers] = useState<TripMember[]>([])
  const [openAdd, setOpenAdd] = useState(false)

  const fetchMembers = useCallback(async () => {
    try {
      const response = await axios.get(`/api/trips/${tripId}/members`)
      setMembers(response.data)
    } catch (err) {
      console.error("Error fetching members:", err)
    }
  }, [tripId])

  useEffect(() => {
    fetchMembers()
  }, [fetchMembers])

  const handleDelete = async (memberId: string) => {
    if (!window.confirm("Are you sure you want to remove this member?")) return
    try {
      await axios.delete(`/api/members/${memberId}`)
      fetchMembers()
    } catch (err) {
      console.error("Error deleting member:", err)
    }
  }

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
        <Typography variant="h6">Trip Members</Typography>
        <Button startIcon={<PersonAddIcon />} variant="outlined" size="small" onClick={() => setOpenAdd(true)}>
          Add Member
        </Button>
      </Box>

      <List>
        {members.map((member) => (
          <ListItem
            key={member.id}
            secondaryAction={
              <IconButton edge="end" aria-label="delete" onClick={() => handleDelete(member.id)}>
                <DeleteIcon />
              </IconButton>
            }
          >
            <ListItemAvatar>
              <Avatar src={member.avatar_url} sx={{ bgcolor: member.color || "primary.main" }}>
                {member.name.charAt(0).toUpperCase()}
              </Avatar>
            </ListItemAvatar>
            <ListItemText
              primary={member.name}
              secondary={
                <React.Fragment>
                  <Typography component="span" variant="body2" color="text.primary">
                    {member.email}
                  </Typography>
                  {member.role === "owner" && (
                    <Chip label="Owner" size="small" color="primary" sx={{ ml: 1, height: 20 }} />
                  )}
                </React.Fragment>
              }
            />
          </ListItem>
        ))}
      </List>

      <Dialog open={openAdd} onClose={() => setOpenAdd(false)}>
        <DialogTitle>Add New Member</DialogTitle>
        <DialogContent>
          <AddMemberForm
            tripId={tripId}
            onSuccess={() => {
              setOpenAdd(false)
              fetchMembers()
            }}
            onCancel={() => setOpenAdd(false)}
          />
        </DialogContent>
      </Dialog>
    </Box>
  )
}

export default MembersList
