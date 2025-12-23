import {
  Add as AddIcon,
  Delete as DeleteIcon,
  CheckCircle,
  RadioButtonUnchecked,
  Assignment,
  ContentPaste,
} from "@mui/icons-material"
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  TextField,
  Button,
  Paper,
  Divider,
  Checkbox,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Grid,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from "@mui/material"
import { useState } from "react"

import { useChecklist } from "../hooks/useChecklist"
import { useLanguageStore } from "../stores/languageStore"
import type { TripChecklistItem } from "../types"

interface PreparationPanelProps {
  tripId: string
  canEdit: boolean
}

const PreparationPanel = ({ tripId, canEdit }: PreparationPanelProps) => {
  const { t } = useLanguageStore()
  const { items, templates, isLoading, addItem, updateItem, deleteItem, importTemplates, isProcessing } =
    useChecklist(tripId)

  const [newTask, setNewTask] = useState("")
  const [newCategory, setNewCategory] = useState("General")
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false)
  const [selectedTemplates, setSelectedTemplates] = useState<string[]>([])

  const handleAddItem = async () => {
    if (!newTask.trim()) return
    await addItem({ task: newTask.trim(), category: newCategory })
    setNewTask("")
    setNewCategory("General")
  }

  const toggleItem = async (item: TripChecklistItem) => {
    await updateItem({ id: item.id, data: { isDone: !item.isDone } })
  }

  const updateCategory = async (item: TripChecklistItem, newCat: string) => {
    await updateItem({ id: item.id, data: { category: newCat } })
  }

  const handleImport = async () => {
    if (selectedTemplates.length === 0) return
    await importTemplates(selectedTemplates)
    setTemplateDialogOpen(false)
    setSelectedTemplates([])
  }

  // Group items by category
  const categories = Array.from(new Set(items.map((item) => item.category || "General")))
  const progress = items.length > 0 ? (items.filter((i) => i.isDone).length / items.length) * 100 : 0

  if (isLoading) return <LinearProgress />

  return (
    <Box sx={{ p: 2 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h6" gutterBottom>
            {t("tripPreparation")}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {items.filter((i) => i.isDone).length} of {items.length} tasks completed
          </Typography>
        </Box>
        {canEdit && (
          <Button variant="outlined" startIcon={<ContentPaste />} onClick={() => setTemplateDialogOpen(true)}>
            Import from Templates
          </Button>
        )}
      </Box>

      <Box mb={4}>
        <LinearProgress variant="determinate" value={progress} sx={{ height: 8, borderRadius: 4 }} />
      </Box>

      {canEdit && (
        <Paper variant="outlined" sx={{ p: 2, mb: 4, display: "flex", gap: 2 }}>
          <TextField
            fullWidth
            size="small"
            placeholder="Add a new task..."
            value={newTask}
            onChange={(e) => setNewTask(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleAddItem()}
            disabled={isProcessing}
          />
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Category</InputLabel>
            <Select
              value={newCategory}
              label="Category"
              onChange={(e) => setNewCategory(e.target.value)}
              disabled={isProcessing}
            >
              {categories.length > 0 ? (
                categories.map((cat) => (
                  <MenuItem key={cat} value={cat}>
                    {cat}
                  </MenuItem>
                ))
              ) : (
                <MenuItem value="General">General</MenuItem>
              )}
              <MenuItem value="__new__" sx={{ fontStyle: "italic", color: "primary.main" }}>
                + New Category
              </MenuItem>
            </Select>
          </FormControl>
          <Button variant="contained" startIcon={<AddIcon />} onClick={handleAddItem} disabled={isProcessing}>
            Add
          </Button>
        </Paper>
      )}

      {categories.length === 0 && (
        <Box textAlign="center" py={8}>
          <Assignment sx={{ fontSize: 64, color: "divider", mb: 2 }} />
          <Typography color="text.secondary">No tasks yet. Start adding some or import from templates!</Typography>
        </Box>
      )}

      <Grid container spacing={3}>
        {categories.map((category) => (
          <Grid size={{ xs: 12, md: 6 }} key={category}>
            <Paper variant="outlined" sx={{ mb: 2 }}>
              <Box p={2} bgcolor="action.hover">
                <Typography variant="subtitle1" fontWeight="bold">
                  {category}
                </Typography>
              </Box>
              <Divider />
              <List dense>
                {items
                  .filter((item) => (item.category || "General") === category)
                  .map((item) => (
                    <ListItem key={item.id} sx={{ opacity: item.isDone ? 0.6 : 1 }}>
                      <ListItemIcon>
                        <Checkbox
                          edge="start"
                          checked={item.isDone}
                          onChange={() => toggleItem(item)}
                          disabled={!canEdit || isProcessing}
                          icon={<RadioButtonUnchecked fontSize="small" />}
                          checkedIcon={<CheckCircle fontSize="small" color="success" />}
                        />
                      </ListItemIcon>
                      <ListItemText
                        primary={item.task}
                        sx={{ textDecoration: item.isDone ? "line-through" : "none" }}
                      />
                      {canEdit && (
                        <ListItemSecondaryAction sx={{ display: "flex", gap: 1, alignItems: "center" }}>
                          <FormControl size="small" sx={{ minWidth: 120 }}>
                            <Select
                              value={item.category || "General"}
                              onChange={(e) => updateCategory(item, e.target.value)}
                              disabled={isProcessing}
                              variant="standard"
                            >
                              {categories.map((cat) => (
                                <MenuItem key={cat} value={cat}>
                                  {cat}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                          <IconButton
                            edge="end"
                            size="small"
                            onClick={() => deleteItem(item.id)}
                            disabled={isProcessing}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </ListItemSecondaryAction>
                      )}
                    </ListItem>
                  ))}
              </List>
            </Paper>
          </Grid>
        ))}
      </Grid>

      <Dialog open={templateDialogOpen} onClose={() => setTemplateDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Import from Templates</DialogTitle>
        <DialogContent dividers>
          <Box display="flex" flexWrap="wrap" gap={1} mb={2}>
            {templates.map((template) => (
              <Chip
                key={template.id}
                label={template.task}
                onClick={() => {
                  setSelectedTemplates((prev) =>
                    prev.includes(template.id) ? prev.filter((id) => id !== template.id) : [...prev, template.id],
                  )
                }}
                color={selectedTemplates.includes(template.id) ? "primary" : "default"}
                variant={selectedTemplates.includes(template.id) ? "filled" : "outlined"}
                icon={<Assignment fontSize="small" />}
                sx={{ p: 1 }}
              />
            ))}
          </Box>
          <Typography variant="caption" color="text.secondary">
            Select standard tasks to add to your trip.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTemplateDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" disabled={selectedTemplates.length === 0 || isProcessing} onClick={handleImport}>
            Import Selected
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default PreparationPanel
