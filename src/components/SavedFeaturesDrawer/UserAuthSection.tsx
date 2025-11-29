import { Box, Typography, Button, TextField } from "@mui/material"
import React, { useState } from "react"
import { MdContentCopy } from "react-icons/md"

import { showSuccess } from "../../utils/notifications"

interface UserAuthSectionProps {
  email: string | null
  userId: string
  setUserId: (id: string) => void
  logout: () => void
  onLoginClick: () => void
}

export const UserAuthSection: React.FC<UserAuthSectionProps> = ({ email, userId, setUserId, logout, onLoginClick }) => {
  const [inputUserId, setInputUserId] = useState("")

  return (
    <Box sx={{ p: 2, borderTop: 1, borderColor: "divider", bgcolor: "background.default" }}>
      {email ? (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
          <Typography variant="subtitle2">Logged in as:</Typography>
          <Typography variant="body2" sx={{ fontWeight: "bold" }}>
            {email}
          </Typography>
          <Button variant="outlined" size="small" color="error" onClick={logout}>
            Logout
          </Button>
        </Box>
      ) : (
        <>
          <Box sx={{ mb: 2 }}>
            <Button fullWidth variant="contained" onClick={onLoginClick}>
              Login / Sign Up
            </Button>
          </Box>
          <Typography variant="subtitle2" gutterBottom>
            Guest Sync
          </Typography>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
            <Typography
              variant="caption"
              sx={{ fontFamily: "monospace", bgcolor: "action.hover", p: 0.5, borderRadius: 1 }}
            >
              {userId}
            </Typography>
            <Button
              size="small"
              startIcon={<MdContentCopy />}
              onClick={() => {
                navigator.clipboard.writeText(userId)
                showSuccess("User ID copied to clipboard")
              }}
            >
              Copy
            </Button>
          </Box>
          <Box sx={{ display: "flex", gap: 1 }}>
            <TextField
              size="small"
              label="Enter ID to Sync"
              value={inputUserId}
              onChange={(e) => setInputUserId(e.target.value)}
              fullWidth
            />
            <Button
              variant="contained"
              onClick={() => {
                if (inputUserId) {
                  setUserId(inputUserId)
                  showSuccess("Synced with user ID")
                  setInputUserId("")
                }
              }}
              disabled={!inputUserId}
            >
              Sync
            </Button>
          </Box>
        </>
      )}
    </Box>
  )
}
