import { Box, Button, Dialog, DialogContent, DialogTitle, TextField, Typography } from "@mui/material"
import React, { useState } from "react"
import { MdContentCopy } from "react-icons/md"

import { showSuccess } from "../../utils/notifications"

interface GuestSyncModalProps {
  open: boolean
  onClose: () => void
  userId: string
  setUserId: (id: string) => void
}

export const GuestSyncModal: React.FC<GuestSyncModalProps> = ({ open, onClose, userId, setUserId }) => {
  const [inputUserId, setInputUserId] = useState("")

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Guest Synchronization</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" paragraph>
          Use this ID to sync your guest data across devices or browsers.
        </Typography>

        <Typography variant="subtitle2" gutterBottom>
          Your Guest ID
        </Typography>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 3 }}>
          <Typography
            variant="body2"
            sx={{
              fontFamily: "monospace",
              bgcolor: "action.hover",
              p: 1,
              borderRadius: 1,
              flexGrow: 1,
              textAlign: "center",
            }}
          >
            {userId}
          </Typography>
          <Button
            variant="outlined"
            startIcon={<MdContentCopy />}
            onClick={() => {
              navigator.clipboard.writeText(userId)
              showSuccess("User ID copied to clipboard")
            }}
          >
            Copy
          </Button>
        </Box>

        <Typography variant="subtitle2" gutterBottom>
          Sync with another ID
        </Typography>
        <Box sx={{ display: "flex", gap: 1 }}>
          <TextField
            size="small"
            label="Enter Guest ID"
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
                onClose()
              }
            }}
            disabled={!inputUserId}
          >
            Sync
          </Button>
        </Box>
      </DialogContent>
    </Dialog>
  )
}
