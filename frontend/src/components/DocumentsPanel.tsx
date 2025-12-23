import { Add as AddIcon, Delete as DeleteIcon, Description, Launch, Note, InsertDriveFile } from "@mui/icons-material"
import {
  Box,
  Typography,
  IconButton,
  TextField,
  Button,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Card,
  CardContent,
  CardActions,
  LinearProgress,
} from "@mui/material"
import { useState } from "react"

import { useDocuments } from "../hooks/useDocuments"
import { useLanguageStore } from "../stores/languageStore"

interface DocumentsPanelProps {
  tripId: string
  canEdit: boolean
}

const DocumentsPanel = ({ tripId, canEdit }: DocumentsPanelProps) => {
  const { t } = useLanguageStore()
  const { documents, isLoading, createDocument, deleteDocument, isProcessing } = useDocuments(tripId)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [newDoc, setNewDoc] = useState({ title: "", url: "", notes: "", category: "General" })

  const handleCreate = async () => {
    if (!newDoc.title || !newDoc.url) return
    await createDocument({ ...newDoc, tripId })
    setDialogOpen(false)
    setNewDoc({ title: "", url: "", notes: "", category: "General" })
  }

  if (isLoading) return <LinearProgress />

  return (
    <Box sx={{ p: 2 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h6" gutterBottom>
            {t("tripDocuments")}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Store links to flight tickets, hotel bookings, and other important files.
          </Typography>
        </Box>
        {canEdit && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialogOpen(true)}>
            Add Document
          </Button>
        )}
      </Box>

      {documents.length === 0 && (
        <Box textAlign="center" py={8}>
          <InsertDriveFile sx={{ fontSize: 64, color: "divider", mb: 2 }} />
          <Typography color="text.secondary">
            No documents added yet. Keep all your travel files in one place!
          </Typography>
        </Box>
      )}

      <Grid container spacing={2}>
        {documents.map((doc) => (
          <Grid size={{ xs: 12, md: 6 }} key={doc.id}>
            <Card variant="outlined">
              <CardContent>
                <Box display="flex" alignItems="center" gap={1} mb={1}>
                  <Description color="primary" />
                  <Typography variant="subtitle1" fontWeight="bold">
                    {doc.title}
                  </Typography>
                </Box>
                {doc.notes && (
                  <Box display="flex" alignItems="flex-start" gap={1}>
                    <Note fontSize="small" color="action" />
                    <Typography variant="body2" color="text.secondary" sx={{ flexGrow: 1 }}>
                      {doc.notes}
                    </Typography>
                  </Box>
                )}
                <Typography variant="caption" color="text.secondary" display="block" mt={1}>
                  Added on {new Date(doc.createdAt).toLocaleDateString()}
                </Typography>
              </CardContent>
              <Divider />
              <CardActions sx={{ justifyContent: "flex-end" }}>
                {canEdit && (
                  <IconButton size="small" onClick={() => deleteDocument(doc.id)} disabled={isProcessing}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                )}
                <Button
                  size="small"
                  startIcon={<Launch />}
                  onClick={() => window.open(doc.url, "_blank")}
                  variant="outlined"
                >
                  Open Link
                </Button>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add New Document</DialogTitle>
        <DialogContent dividers>
          <Box display="flex" flexDirection="column" gap={2} pt={1}>
            <TextField
              fullWidth
              label="Title"
              placeholder="e.g. Flight Confirmation PDF"
              value={newDoc.title}
              onChange={(e) => setNewDoc({ ...newDoc, title: e.target.value })}
              autoFocus
            />
            <TextField
              fullWidth
              label="URL / Link"
              placeholder="https://..."
              value={newDoc.url}
              onChange={(e) => setNewDoc({ ...newDoc, url: e.target.value })}
            />
            <TextField
              fullWidth
              label="Notes (Optional)"
              multiline
              rows={2}
              value={newDoc.notes}
              onChange={(e) => setNewDoc({ ...newDoc, notes: e.target.value })}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" disabled={!newDoc.title || !newDoc.url || isProcessing} onClick={handleCreate}>
            Add Document
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default DocumentsPanel
