import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Link as LinkIcon,
  OpenInNew as OpenIcon,
  Description as DocIcon,
  Edit as EditIcon,
} from "@mui/icons-material"
import {
  Box,
  Button,
  IconButton,
  List,
  ListItem,
  ListItemAvatar,
  ListItemSecondaryAction,
  ListItemText,
  Paper,
  TextField,
  Typography,
  Avatar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Alert,
} from "@mui/material"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import React, { useState } from "react"

import { documentApi } from "../api/client"
import { useLanguageStore } from "../stores/languageStore"
import type { Trip, TripDocument } from "../types"

interface DocumentOrganizerProps {
  trip: Trip
}

export const DocumentOrganizer: React.FC<DocumentOrganizerProps> = ({ trip }) => {
  const { t } = useLanguageStore()
  const tripId = trip.id
  const queryClient = useQueryClient()
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [editingDoc, setEditingDoc] = useState<TripDocument | null>(null)

  const [formTitle, setFormTitle] = useState("")
  const [formUrl, setFormUrl] = useState("")
  const [formNotes, setFormNotes] = useState("")

  const {
    data: documents,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["documents", tripId],
    queryFn: () => documentApi.list(tripId),
  })

  const createMutation = useMutation({
    mutationFn: (data: { tripId: string; title: string; url: string; notes?: string }) => documentApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents", tripId] })
      handleCloseAdd()
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<TripDocument> }) => documentApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents", tripId] })
      handleCloseEdit()
    },
  })

  const deleteMutation = useMutation({
    mutationFn: documentApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents", tripId] })
    },
  })

  const handleOpenAdd = () => {
    setFormTitle("")
    setFormUrl("")
    setFormNotes("")
    setIsAddOpen(true)
  }

  const handleCloseAdd = () => {
    setIsAddOpen(false)
  }

  const handleOpenEdit = (doc: TripDocument) => {
    setEditingDoc(doc)
    setFormTitle(doc.title)
    setFormUrl(doc.url)
    setFormNotes(doc.notes || "")
    setIsEditOpen(true)
  }

  const handleCloseEdit = () => {
    setIsEditOpen(false)
    setEditingDoc(null)
  }

  const handleAddSubmit = () => {
    if (!formTitle || !formUrl) return
    const url = formUrl.startsWith("http") ? formUrl : `https://${formUrl}`
    createMutation.mutate({ tripId, title: formTitle, url, notes: formNotes })
  }

  const handleEditSubmit = () => {
    if (!editingDoc || !formTitle || !formUrl) return
    const url = formUrl.startsWith("http") ? formUrl : `https://${formUrl}`
    updateMutation.mutate({
      id: editingDoc.id,
      data: { title: formTitle, url, notes: formNotes },
    })
  }

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" py={4}>
        <CircularProgress size={24} />
      </Box>
    )
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        Failed to load documents: {(error as any).message}
      </Alert>
    )
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6">{t("documentsLinks")}</Typography>
        <Button startIcon={<AddIcon />} variant="contained" size="small" onClick={handleOpenAdd}>
          {t("addDocument")}
        </Button>
      </Box>

      <Paper variant="outlined">
        {!documents || documents.length === 0 ? (
          <Box p={4} textAlign="center">
            <DocIcon sx={{ fontSize: 48, color: "text.disabled", mb: 1 }} />
            <Typography color="text.secondary">{t("noDocuments")}</Typography>
          </Box>
        ) : (
          <List>
            {documents.map((doc) => (
              <ListItem key={doc.id} divider>
                <ListItemAvatar>
                  <Avatar sx={{ bgcolor: "primary.light" }}>
                    <LinkIcon />
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={doc.title}
                  secondary={
                    <React.Fragment>
                      <Typography variant="body2" color="text.secondary" noWrap>
                        {doc.url}
                      </Typography>
                      {doc.notes && (
                        <Typography
                          variant="caption"
                          color="text.primary"
                          display="block"
                          sx={{ mt: 0.5, fontStyle: "italic" }}
                        >
                          {doc.notes}
                        </Typography>
                      )}
                    </React.Fragment>
                  }
                />
                <ListItemSecondaryAction>
                  <IconButton
                    edge="end"
                    onClick={() => window.open(doc.url, "_blank")}
                    sx={{ mr: 1 }}
                    title="Open Link"
                  >
                    <OpenIcon />
                  </IconButton>
                  <IconButton edge="end" onClick={() => handleOpenEdit(doc)} sx={{ mr: 1 }} title="Edit">
                    <EditIcon />
                  </IconButton>
                  <IconButton
                    edge="end"
                    onClick={() => {
                      if (confirm(t("areYouSureDeleteDocument"))) {
                        deleteMutation.mutate(doc.id)
                      }
                    }}
                    title="Delete"
                  >
                    <DeleteIcon />
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
        )}
      </Paper>

      <Dialog open={isAddOpen} onClose={handleCloseAdd} maxWidth="xs" fullWidth>
        <DialogTitle>{t("addDocument")}</DialogTitle>
        <DialogContent dividers>
          <Box display="flex" flexDirection="column" gap={2} mt={1}>
            <TextField
              label={t("title")}
              fullWidth
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              placeholder="e.g. Flight Tickets"
              autoFocus
            />
            <TextField
              label={t("url")}
              fullWidth
              value={formUrl}
              onChange={(e) => setFormUrl(e.target.value)}
              placeholder="e.g. https://..."
            />
            <TextField
              label={t("notes")}
              fullWidth
              multiline
              rows={2}
              value={formNotes}
              onChange={(e) => setFormNotes(e.target.value)}
              placeholder={t("documentNotesPlaceholder")}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseAdd}>{t("cancel")}</Button>
          <Button
            onClick={handleAddSubmit}
            variant="contained"
            disabled={!formTitle || !formUrl || createMutation.isPending}
          >
            {createMutation.isPending ? t("saving") : t("add")}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={isEditOpen} onClose={handleCloseEdit} maxWidth="xs" fullWidth>
        <DialogTitle>{t("editDocument")}</DialogTitle>
        <DialogContent dividers>
          <Box display="flex" flexDirection="column" gap={2} mt={1}>
            <TextField
              label={t("title")}
              fullWidth
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              placeholder="e.g. Flight Tickets"
              autoFocus
            />
            <TextField
              label={t("url")}
              fullWidth
              value={formUrl}
              onChange={(e) => setFormUrl(e.target.value)}
              placeholder="e.g. https://..."
            />
            <TextField
              label={t("notes")}
              fullWidth
              multiline
              rows={2}
              value={formNotes}
              onChange={(e) => setFormNotes(e.target.value)}
              placeholder={t("documentNotesPlaceholder")}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseEdit}>{t("cancel")}</Button>
          <Button
            onClick={handleEditSubmit}
            variant="contained"
            disabled={!formTitle || !formUrl || updateMutation.isPending}
          >
            {updateMutation.isPending ? t("saving") : t("saveChanges")}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
