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

import { useLanguageStore } from "../stores/languageStore"
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
  const { t } = useLanguageStore()
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
        <Typography variant="h6">{t("tripAnimations")}</Typography>
        <Button variant="contained" startIcon={<Add />} onClick={onCreate} size="small">
          {t("createAnimation")}
        </Button>
      </Box>

      {animations.length === 0 ? (
        <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 4 }}>
          {t("noAnimations")}
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
                    <Chip label={`${animation.steps.length} ${t("steps")}`} size="small" variant="outlined" />
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
                  <Tooltip title={t("playAnimation")}>
                    <IconButton edge="end" onClick={() => onPlay(animation)} color="primary" size="small">
                      <PlayArrow />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title={t("editAnimation")}>
                    <IconButton edge="end" onClick={() => onEdit(animation)} size="small">
                      <Edit fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title={t("deleteAnimation")}>
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
        <DialogTitle>{t("deleteAnimationTitle")}</DialogTitle>
        <DialogContent>
          <Typography>
            {t("deleteAnimationConfirmation")} &quot;{selectedAnimation?.name}&quot;?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelDelete}>{t("cancel")}</Button>
          <Button onClick={handleConfirmDelete} color="error" variant="contained">
            {t("delete")}
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  )
}
