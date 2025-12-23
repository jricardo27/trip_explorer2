import {
  Add as AddIcon,
  Delete as DeleteIcon,
  CheckCircle,
  RadioButtonUnchecked,
  Backpack,
  ContentPaste,
  Remove as RemoveIcon,
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
  Tooltip,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from "@mui/material"
import { useState } from "react"

import { usePackingList } from "../hooks/usePackingList"
import { useLanguageStore } from "../stores/languageStore"
import type { TripPackingItem } from "../types"

interface PackingPanelProps {
  tripId: string
  canEdit: boolean
}

const PackingPanel = ({ tripId, canEdit }: PackingPanelProps) => {
  const { t } = useLanguageStore()
  const { items, templates, isLoading, addItem, updateItem, deleteItem, importTemplates, isProcessing } =
    usePackingList(tripId)

  const [newItemName, setNewItemName] = useState("")
  const [newCategory, setNewCategory] = useState("Miscellaneous")
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false)
  const [selectedTemplates, setSelectedTemplates] = useState<string[]>([])

  const handleAddItem = async () => {
    if (!newItemName.trim()) return
    await addItem({ item: newItemName.trim(), category: newCategory, quantity: 1 })
    setNewItemName("")
    setNewCategory("Miscellaneous")
  }

  const toggleItem = async (item: TripPackingItem) => {
    await updateItem({ id: item.id, data: { isPacked: !item.isPacked } })
  }

  const updateQuantity = async (item: TripPackingItem, delta: number) => {
    const newQuantity = Math.max(1, item.quantity + delta)
    if (newQuantity === item.quantity) return
    await updateItem({ id: item.id, data: { quantity: newQuantity } })
  }

  const updateCategory = async (item: TripPackingItem, newCat: string) => {
    await updateItem({ id: item.id, data: { category: newCat } })
  }

  const handleImport = async () => {
    if (selectedTemplates.length === 0) return
    await importTemplates(selectedTemplates)
    setTemplateDialogOpen(false)
    setSelectedTemplates([])
  }

  // Group items by category
  const categories = Array.from(new Set(items.map((item) => item.category || "Miscellaneous")))
  const progress = items.length > 0 ? (items.filter((i) => i.isPacked).length / items.length) * 100 : 0

  if (isLoading) return <LinearProgress />

  return (
    <Box sx={{ p: 2 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h6" gutterBottom>
            {t("packingList")}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {items.filter((i) => i.isPacked).length} of {items.length} items packed
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
            placeholder="What else do you need to pack?"
            value={newItemName}
            onChange={(e) => setNewItemName(e.target.value)}
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
                <MenuItem value="Miscellaneous">Miscellaneous</MenuItem>
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
          <Backpack sx={{ fontSize: 64, color: "divider", mb: 2 }} />
          <Typography color="text.secondary">Your packing list is empty. Start adding items!</Typography>
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
                  .filter((item) => (item.category || "Miscellaneous") === category)
                  .map((item) => (
                    <ListItem key={item.id} sx={{ opacity: item.isPacked ? 0.6 : 1 }}>
                      <ListItemIcon>
                        <Checkbox
                          edge="start"
                          checked={item.isPacked}
                          onChange={() => toggleItem(item)}
                          disabled={!canEdit || isProcessing}
                          icon={<RadioButtonUnchecked fontSize="small" />}
                          checkedIcon={<CheckCircle fontSize="small" color="success" />}
                        />
                      </ListItemIcon>
                      <ListItemText
                        primary={item.item}
                        secondary={item.quantity > 1 ? `Quantity: ${item.quantity}` : null}
                        sx={{ textDecoration: item.isPacked ? "line-through" : "none" }}
                      />
                      <ListItemSecondaryAction sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        {canEdit && !item.isPacked && (
                          <Box display="flex" alignItems="center" mr={1}>
                            <Tooltip title="Decrease quantity">
                              <IconButton
                                size="small"
                                onClick={() => updateQuantity(item, -1)}
                                disabled={isProcessing || item.quantity <= 1}
                              >
                                <RemoveIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Typography variant="body2" sx={{ minWidth: 20, textAlign: "center" }}>
                              {item.quantity}
                            </Typography>
                            <Tooltip title="Increase quantity">
                              <IconButton size="small" onClick={() => updateQuantity(item, 1)} disabled={isProcessing}>
                                <AddIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        )}
                        {canEdit && (
                          <>
                            <FormControl size="small" sx={{ minWidth: 100 }}>
                              <Select
                                value={item.category || "Miscellaneous"}
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
                          </>
                        )}
                      </ListItemSecondaryAction>
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
                label={template.item}
                onClick={() => {
                  setSelectedTemplates((prev) =>
                    prev.includes(template.id) ? prev.filter((id) => id !== template.id) : [...prev, template.id],
                  )
                }}
                color={selectedTemplates.includes(template.id) ? "primary" : "default"}
                variant={selectedTemplates.includes(template.id) ? "filled" : "outlined"}
                icon={<Backpack fontSize="small" />}
                sx={{ p: 1 }}
              />
            ))}
          </Box>
          <Typography variant="caption" color="text.secondary">
            Select standard items to add to your trip packing list.
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

export default PackingPanel
