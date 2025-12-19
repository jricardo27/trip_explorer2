import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  useDroppable,
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
  PlaylistAddCheck as ImportIcon,
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

import { checklistApi, tripApi } from "../api/client"
import type { Trip, TripChecklistItem } from "../types"

interface ChecklistPanelProps {
  trip: Trip
}

interface SortableItemProps {
  item: TripChecklistItem
  onToggle: (id: string, isDone: boolean) => void
  onDelete: (id: string) => void
}

const SortableChecklistItem = ({ item, onToggle, onDelete }: SortableItemProps) => {
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
          checked={item.isDone}
          onChange={(e) => onToggle(item.id, e.target.checked)}
          onClick={(e) => e.stopPropagation()}
        />
      </ListItemIcon>
      <ListItemText
        primary={item.task}
        sx={{
          textDecoration: item.isDone ? "line-through" : "none",
          color: item.isDone ? "text.disabled" : "text.primary",
        }}
      />
    </ListItem>
  )
}

const DroppableCategory = ({ category, children }: { category: string; children: React.ReactNode }) => {
  const { setNodeRef } = useDroppable({
    id: category,
  })

  return (
    <Box ref={setNodeRef} mb={4} id={category}>
      {children}
    </Box>
  )
}

export const ChecklistPanel = ({ trip }: ChecklistPanelProps) => {
  const { id: tripId, checklistItems: items = [] } = trip
  const queryClient = useQueryClient()
  const [newTask, setNewTask] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("General")
  const [isImportOpen, setIsImportOpen] = useState(false)
  const [isNewCategoryDialogOpen, setIsNewCategoryDialogOpen] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState("")
  const [selectedTemplates, setSelectedTemplates] = useState<string[]>([])

  const categories = useMemo(() => {
    return trip.checklistCategories || ["General", "Preparation", "Booking", "Packing"]
  }, [trip.checklistCategories])

  const { data: templates } = useQuery({
    queryKey: ["checklist-templates"],
    queryFn: checklistApi.listTemplates,
  })

  const createMutation = useMutation({
    mutationFn: (data: { task: string; category?: string }) => checklistApi.createTripItem(tripId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trips", tripId] })
      setNewTask("")
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<TripChecklistItem> }) =>
      checklistApi.updateTripItem(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trips", tripId] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: checklistApi.deleteTripItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trips", tripId] })
    },
  })

  const updateTripCategoriesMutation = useMutation({
    mutationFn: (newCategories: string[]) => tripApi.updateCategories(tripId, { checklistCategories: newCategories }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trips", tripId] })
    },
  })

  const importMutation = useMutation({
    mutationFn: (ids: string[]) => checklistApi.importTemplates(tripId, ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trips", tripId] })
      setIsImportOpen(false)
      setSelectedTemplates([])
    },
  })

  const handleAddTask = () => {
    if (newTask.trim()) {
      createMutation.mutate({ task: newTask, category: selectedCategory })
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
      setSelectedCategory("General")
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

    // If dropped over a category header or another item
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
      {} as Record<string, TripChecklistItem[]>,
    )

    items.forEach((item) => {
      const cat = item.category || "General"
      if (!grouped[cat]) grouped[cat] = []
      grouped[cat].push(item)
    })

    return grouped
  }, [items, categories])

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6">Pre-Trip Checklist</Typography>
        <Button
          startIcon={<ImportIcon />}
          size="small"
          onClick={() => setIsImportOpen(true)}
          disabled={!templates || templates.length === 0}
        >
          Import Templates
        </Button>
      </Box>

      <Paper sx={{ p: 2, mb: 3 }}>
        <Box display="flex" gap={2} alignItems="center">
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Category</InputLabel>
            <Select value={selectedCategory} label="Category" onChange={(e) => setSelectedCategory(e.target.value)}>
              {categories.map((cat) => (
                <MenuItem key={cat} value={cat}>
                  {cat}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Tooltip title="Add New Category">
            <IconButton onClick={() => setIsNewCategoryDialogOpen(true)} color="primary">
              <AddCategoryIcon />
            </IconButton>
          </Tooltip>
          <TextField
            size="small"
            label="New Task"
            fullWidth
            value={newTask}
            onChange={(e) => setNewTask(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleAddTask()}
          />
          <IconButton color="primary" onClick={handleAddTask} disabled={!newTask.trim()}>
            <AddIcon />
          </IconButton>
        </Box>
      </Paper>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        {Object.entries(groupedItems).map(([category, catItems]) => (
          <DroppableCategory key={category} category={category}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
              <Typography variant="subtitle2" color="primary" sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                {category}
                <Chip size="small" label={catItems.length} />
              </Typography>
              {category !== "General" && (
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
                  <SortableChecklistItem
                    key={item.id}
                    item={item}
                    onToggle={(id, isDone) => updateMutation.mutate({ id, data: { isDone } })}
                    onDelete={(id) => deleteMutation.mutate(id)}
                  />
                ))}
                {catItems.length === 0 && (
                  <Typography
                    variant="caption"
                    color="text.disabled"
                    sx={{ p: 2, display: "block", textAlign: "center" }}
                  >
                    Drag items here
                  </Typography>
                )}
              </List>
            </SortableContext>
            <Divider sx={{ mt: 2 }} />
          </DroppableCategory>
        ))}
      </DndContext>

      {items.length === 0 && (
        <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 4 }}>
          No tasks yet. Add one above or import from templates.
        </Typography>
      )}

      {/* New Category Dialog */}
      <Dialog open={isNewCategoryDialogOpen} onClose={() => setIsNewCategoryDialogOpen(false)}>
        <DialogTitle>Add New Category</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Category Name"
            fullWidth
            variant="standard"
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleAddCategory()}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsNewCategoryDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleAddCategory} variant="contained" disabled={!newCategoryName.trim()}>
            Add
          </Button>
        </DialogActions>
      </Dialog>

      {/* Import Dialog */}
      <Dialog open={isImportOpen} onClose={() => setIsImportOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Import from Global Templates</DialogTitle>
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
                      <Typography variant="body2">{t.task}</Typography>
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
          <Button onClick={() => setIsImportOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={() => importMutation.mutate(selectedTemplates)}
            disabled={selectedTemplates.length === 0}
          >
            Import {selectedTemplates.length} Items
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
