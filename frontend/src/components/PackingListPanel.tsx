import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  PlaylistAdd as ImportIcon,
  DragIndicator as DragIcon,
  CreateNewFolder as AddCategoryIcon,
} from "@mui/icons-material"
import {
  Box,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  IconButton,
  Checkbox,
  TextField,
  Button,
  Divider,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControlLabel,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Tooltip,
} from "@mui/material"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useState, useMemo } from "react"

import { packingApi, tripApi } from "../api/client"
import { useLanguageStore } from "../stores/languageStore"
import type { Trip, TripPackingItem } from "../types"

interface PackingListPanelProps {
  trip: Trip
}

interface SortableItemProps {
  item: TripPackingItem
  onToggle: (id: string, isPacked: boolean) => void
  onDelete: (id: string) => void
}

const SortablePackingItem = ({ item, onToggle, onDelete }: SortableItemProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
    data: {
      type: "item",
      item,
    },
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1000 : 1,
  }

  return (
    <ListItem
      ref={setNodeRef}
      style={style}
      secondaryAction={
        <Box display="flex" alignItems="center">
          <IconButton edge="end" onClick={() => onDelete(item.id)} size="small" sx={{ mr: 1 }}>
            <DeleteIcon fontSize="small" />
          </IconButton>
          <Box {...attributes} {...listeners} sx={{ cursor: "grab", display: "flex", color: "text.disabled" }}>
            <DragIcon fontSize="small" />
          </Box>
        </Box>
      }
      sx={{
        bgcolor: "background.paper",
        "&:hover": { bgcolor: "action.hover" },
        mb: 0.5,
        borderRadius: 1,
      }}
    >
      <ListItemIcon>
        <Checkbox
          edge="start"
          checked={item.isPacked}
          onChange={(e) => onToggle(item.id, e.target.checked)}
          onClick={(e) => e.stopPropagation()}
        />
      </ListItemIcon>
      <ListItemText
        primary={
          <Box display="flex" alignItems="center" gap={1}>
            {item.item}
            {item.quantity > 1 && (
              <Chip label={`x${item.quantity}`} size="small" sx={{ height: 20, fontSize: "0.7rem" }} />
            )}
          </Box>
        }
        sx={{
          textDecoration: item.isPacked ? "line-through" : "none",
          color: item.isPacked ? "text.disabled" : "text.primary",
        }}
      />
    </ListItem>
  )
}

export const PackingListPanel = ({ trip }: PackingListPanelProps) => {
  const { t } = useLanguageStore()
  const { id: tripId, packingItems: items = [] } = trip
  const queryClient = useQueryClient()
  const [newItemName, setNewItemName] = useState("")
  const [newItemQuantity, setNewItemQuantity] = useState("1")
  const [selectedCategory, setSelectedCategory] = useState("Clothing")
  const [isImportOpen, setIsImportOpen] = useState(false)
  const [isNewCategoryDialogOpen, setIsNewCategoryDialogOpen] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState("")
  const [selectedTemplates, setSelectedTemplates] = useState<string[]>([])

  const categories = useMemo(() => {
    return trip.packingCategories || ["Clothing", "Electronics", "Toiletries", "Gear", "Misc"]
  }, [trip.packingCategories])

  const { data: templates } = useQuery({
    queryKey: ["packing-templates"],
    queryFn: packingApi.listTemplates,
  })

  const createMutation = useMutation({
    mutationFn: (data: { item: string; category?: string; quantity: number }) =>
      packingApi.createTripItem(tripId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trips", tripId] })
      setNewItemName("")
      setNewItemQuantity("1")
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<TripPackingItem> }) => packingApi.updateTripItem(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trips", tripId] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: packingApi.deleteTripItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trips", tripId] })
    },
  })

  const updateTripCategoriesMutation = useMutation({
    mutationFn: (newCategories: string[]) => tripApi.updateCategories(tripId, { packingCategories: newCategories }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trips", tripId] })
    },
  })

  const importMutation = useMutation({
    mutationFn: (ids: string[]) => packingApi.importTemplates(tripId, ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trips", tripId] })
      setIsImportOpen(false)
      setSelectedTemplates([])
    },
  })

  const handleAddItem = () => {
    if (newItemName.trim()) {
      createMutation.mutate({
        item: newItemName,
        category: selectedCategory,
        quantity: parseInt(newItemQuantity) || 1,
      })
    }
  }

  const handleAddCategory = () => {
    if (newCategoryName.trim() && !categories.includes(newCategoryName)) {
      updateTripCategoriesMutation.mutate([...categories, newCategoryName.trim()])
      setSelectedCategory(newCategoryName.trim())
      setNewCategoryName("")
      setIsNewCategoryDialogOpen(false)
    }
  }

  const handleDeleteCategory = (catToDelete: string) => {
    const hasItems = items.some((item) => (item.category || "General") === catToDelete)
    if (hasItems) {
      alert("Cannot delete category with items. Move or delete the items first.")
      return
    }
    updateTripCategoriesMutation.mutate(categories.filter((c) => c !== catToDelete))
    if (selectedCategory === catToDelete) {
      setSelectedCategory(categories[0] || "General")
    }
  }

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over) return

    const activeItem = items.find((i) => i.id === active.id)
    if (!activeItem) return

    const overId = over.id as string
    let newCategory = activeItem.category

    if (categories.includes(overId)) {
      newCategory = overId
    } else {
      const overItem = items.find((i) => i.id === overId)
      if (overItem) {
        newCategory = overItem.category
      }
    }

    if (newCategory !== activeItem.category) {
      updateMutation.mutate({ id: activeItem.id, data: { category: newCategory } })
    }
  }

  const groupedItems = useMemo(() => {
    const grouped = categories.reduce(
      (acc, cat) => {
        acc[cat] = []
        return acc
      },
      {} as Record<string, TripPackingItem[]>,
    )

    items.forEach((item) => {
      const cat = item.category || "Gear"
      if (!grouped[cat]) grouped[cat] = []
      grouped[cat].push(item)
    })

    return grouped
  }, [items, categories])

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6">{t("packingList")}</Typography>
        <Button
          startIcon={<ImportIcon />}
          size="small"
          onClick={() => setIsImportOpen(true)}
          disabled={!templates || templates.length === 0}
        >
          {t("importTemplates")}
        </Button>
      </Box>

      <Paper sx={{ p: 2, mb: 3 }}>
        <Box display="flex" gap={2} alignItems="center">
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>{t("category")}</InputLabel>
            <Select
              value={selectedCategory}
              label={t("category")}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              {categories.map((cat) => (
                <MenuItem key={cat} value={cat}>
                  {t(cat.toLowerCase() as any) || cat}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Tooltip title={t("addNewCategory")}>
            <IconButton onClick={() => setIsNewCategoryDialogOpen(true)} color="primary">
              <AddCategoryIcon />
            </IconButton>
          </Tooltip>
          <TextField
            size="small"
            label={t("item")}
            fullWidth
            value={newItemName}
            onChange={(e) => setNewItemName(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleAddItem()}
          />
          <TextField
            size="small"
            label={t("qty")}
            type="number"
            value={newItemQuantity}
            onChange={(e) => setNewItemQuantity(e.target.value)}
            sx={{ width: 70 }}
          />
          <IconButton color="primary" onClick={handleAddItem} disabled={!newItemName.trim()}>
            <AddIcon />
          </IconButton>
        </Box>
      </Paper>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        {Object.entries(groupedItems).map(([category, catItems]) => (
          <Box key={category} mb={4} id={category}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
              <Typography variant="subtitle2" color="secondary" sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                {t(category.toLowerCase() as any) || category}
                <Chip size="small" label={catItems.length} color="secondary" variant="outlined" />
              </Typography>
              {!["Clothing", "Electronics", "Toiletries", "Gear", "Misc"].includes(category) && (
                <IconButton size="small" onClick={() => handleDeleteCategory(category)}>
                  <DeleteIcon fontSize="inherit" />
                </IconButton>
              )}
            </Box>
            <SortableContext items={catItems.map((i) => i.id)} strategy={verticalListSortingStrategy}>
              <List
                dense
                sx={{
                  bgcolor: "background.paper",
                  borderRadius: 1,
                  minHeight: catItems.length === 0 ? 50 : "auto",
                  border: catItems.length === 0 ? "1px dashed #ccc" : "none",
                }}
              >
                {catItems.map((item) => (
                  <SortablePackingItem
                    key={item.id}
                    item={item}
                    onToggle={(id, isPacked) => updateMutation.mutate({ id, data: { isPacked } })}
                    onDelete={(id) => deleteMutation.mutate(id)}
                  />
                ))}
                {catItems.length === 0 && (
                  <Typography
                    variant="caption"
                    color="text.disabled"
                    sx={{ p: 2, display: "block", textAlign: "center" }}
                  >
                    {t("dragItemsHere")}
                  </Typography>
                )}
              </List>
            </SortableContext>
            <Divider sx={{ mt: 2 }} />
          </Box>
        ))}
      </DndContext>

      {items.length === 0 && (
        <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 4 }}>
          {t("noTasks")}
        </Typography>
      )}

      {/* New Category Dialog */}
      <Dialog open={isNewCategoryDialogOpen} onClose={() => setIsNewCategoryDialogOpen(false)}>
        <DialogTitle>{t("addNewCategory")}</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label={t("categoryName")}
            fullWidth
            variant="standard"
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleAddCategory()}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsNewCategoryDialogOpen(false)}>{t("cancel")}</Button>
          <Button onClick={handleAddCategory} variant="contained" disabled={!newCategoryName.trim()}>
            {t("add")}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Import Dialog */}
      <Dialog open={isImportOpen} onClose={() => setIsImportOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{t("importTemplates")}</DialogTitle>
        <DialogContent dividers>
          <List>
            {templates?.map((t) => (
              <ListItem key={t.id} dense>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={selectedTemplates.includes(t.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedTemplates([...selectedTemplates, t.id])
                        } else {
                          setSelectedTemplates(selectedTemplates.filter((id) => id !== t.id))
                        }
                      }}
                    />
                  }
                  label={
                    <Box>
                      <Typography variant="body2">{t.item}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {t.category}
                      </Typography>
                    </Box>
                  }
                />
              </ListItem>
            ))}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsImportOpen(false)}>{t("cancel")}</Button>
          <Button
            variant="contained"
            onClick={() => importMutation.mutate(selectedTemplates)}
            disabled={selectedTemplates.length === 0}
          >
            {t("import")} {selectedTemplates.length} {t("items")}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
