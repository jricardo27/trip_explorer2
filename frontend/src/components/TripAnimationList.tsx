import { PlayArrow, Edit, Delete, Add } from "@mui/icons-material"
import {
  Box,
  Paper,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Tooltip,
} from "@mui/material"
import { useState } from "react"

import type { TripAnimation } from "../types"

interface TripAnimationListProps {
  animations: TripAnimation[]
  onPlay: (animation: TripAnimation) => void
  onEdit: (animation: TripAnimation) => void
  onDelete: (id: string) => void
  onCreate: () => void
  isDeleting?: boolean
}

export const TripAnimationList: React.FC<TripAnimationListProps> = ({
  animations,
  onPlay,
  onEdit,
  onDelete,
  onCreate,
  isDeleting,
}) => {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedAnimation, setSelectedAnimation] = useState<TripAnimation | null>(null)

  const handleDeleteClick = (animation: TripAnimation) => {
    setSelectedAnimation(animation)
    setDeleteDialogOpen(true)
  }

  const handleConfirmDelete = () => {
    if (selectedAnimation) {
      onDelete(selectedAnimation.id)
      setDeleteDialogOpen(false)
      setSelectedAnimation(null)
    }
  }

  const handleCancelDelete = () => {
    setDeleteDialogOpen(false)
    setSelectedAnimation(null)
  }

  return (
    <Paper sx={{ p: 2 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6">Trip Animations</Typography>
        <Button variant="contained" startIcon={<Add />} onClick={onCreate} size="small">
          Create Animation
        </Button>
      </Box>

      {animations.length === 0 ? (
        <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 4 }}>
          No animations yet. Create one to visualize your trip!
        </Typography>
      ) : (
        <List sx={{ maxHeight: 300, overflowY: "auto" }}>
          {animations.map((animation) => (
            <ListItem
              key={animation.id}
              sx={{
                border: 1,
                borderColor: "divider",
                borderRadius: 1,
                mb: 1,
                "&:hover": {
                  bgcolor: "action.hover",
                },
              }}
            >
              <ListItemText
                primary={
                  <Box display="flex" alignItems="center" gap={1}>
                    <Typography variant="subtitle1">{animation.name}</Typography>
                    <Chip label={`${animation.steps.length} steps`} size="small" variant="outlined" />
                  </Box>
                }
                secondary={
                  <Box>
                    {animation.description && (
                      <Typography variant="body2" color="text.secondary">
                        {animation.description}
                      </Typography>
                    )}
                    <Typography variant="caption" color="text.secondary">
                      Created: {new Date(animation.createdAt).toLocaleDateString()}
                    </Typography>
                  </Box>
                }
              />
              <ListItemSecondaryAction>
                <Box display="flex" gap={0.5}>
                  <Tooltip title="Play Animation">
                    <IconButton edge="end" onClick={() => onPlay(animation)} color="primary" size="small">
                      <PlayArrow />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Edit Animation">
                    <IconButton edge="end" onClick={() => onEdit(animation)} size="small">
                      <Edit fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Delete Animation">
                    <IconButton
                      edge="end"
                      onClick={() => handleDeleteClick(animation)}
                      color="error"
                      size="small"
                      disabled={isDeleting}
                    >
                      <Delete fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
              </ListItemSecondaryAction>
            </ListItem>
          ))}
        </List>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={handleCancelDelete}>
        <DialogTitle>Delete Animation?</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete &quot;{selectedAnimation?.name}&quot;? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelDelete}>Cancel</Button>
          <Button onClick={handleConfirmDelete} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  )
}
