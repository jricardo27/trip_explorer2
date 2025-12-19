import {
  ArrowBack,
  Add as AddIcon,
  Delete as DeleteIcon,
  Checklist as ChecklistIcon,
  Inventory as PackingIcon,
  Settings as SettingsIcon,
} from "@mui/icons-material"
import {
  Box,
  Typography,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Button,
  TextField,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Divider,
  Tab,
  Tabs,
  Chip,
} from "@mui/material"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { useNavigate } from "react-router-dom"

import { checklistApi, packingApi } from "../api/client"
import { useSettingsStore } from "../stores/settingsStore"

const SettingsPage = () => {
  const { dateFormat, currency, setDateFormat, setCurrency } = useSettingsStore()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [tabValue, setTabValue] = useState(0)

  // Form states
  const [newChecklistTask, setNewChecklistTask] = useState("")
  const [newChecklistCategory, setNewChecklistCategory] = useState("General")
  const [newPackingItem, setNewPackingItem] = useState("")
  const [newPackingCategory, setNewPackingCategory] = useState("General")

  const { data: checklistTemplates } = useQuery({
    queryKey: ["checklist-templates"],
    queryFn: checklistApi.listTemplates,
  })

  const { data: packingTemplates } = useQuery({
    queryKey: ["packing-templates"],
    queryFn: packingApi.listTemplates,
  })

  const createChecklistMutation = useMutation({
    mutationFn: checklistApi.createTemplate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["checklist-templates"] })
      setNewChecklistTask("")
    },
  })

  const deleteChecklistMutation = useMutation({
    mutationFn: checklistApi.deleteTemplate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["checklist-templates"] })
    },
  })

  const createPackingMutation = useMutation({
    mutationFn: packingApi.createTemplate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["packing-templates"] })
      setNewPackingItem("")
    },
  })

  const deletePackingMutation = useMutation({
    mutationFn: packingApi.deleteTemplate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["packing-templates"] })
    },
  })

  const locales = [
    { code: "en-AU", label: "Australia (DD/MM/YYYY)" },
    { code: "en-US", label: "United States (MM/DD/YYYY)" },
    { code: "en-GB", label: "United Kingdom (DD/MM/YYYY)" },
    { code: "ja-JP", label: "Japan (YYYY/MM/DD)" },
  ]

  const currencies = [
    { code: "AUD", label: "Australian Dollar ($)" },
    { code: "USD", label: "US Dollar ($)" },
    { code: "EUR", label: "Euro (€)" },
    { code: "GBP", label: "British Pound (£)" },
    { code: "JPY", label: "Japanese Yen (¥)" },
  ]

  return (
    <Box maxWidth="lg" mx="auto" mt={4} px={2} pb={8}>
      <Button startIcon={<ArrowBack />} onClick={() => navigate(-1)} sx={{ mb: 2 }}>
        Back to Dashboard
      </Button>

      <Typography variant="h4" gutterBottom fontWeight="bold">
        Application Settings
      </Typography>

      <Paper sx={{ mb: 3 }}>
        <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)} indicatorColor="primary" textColor="primary">
          <Tab icon={<SettingsIcon />} label="General" iconPosition="start" />
          <Tab icon={<ChecklistIcon />} label="Checklist Templates" iconPosition="start" />
          <Tab icon={<PackingIcon />} label="Packing Templates" iconPosition="start" />
        </Tabs>
      </Paper>

      {tabValue === 0 && (
        <Paper sx={{ p: 4 }}>
          <Typography variant="h6" gutterBottom>
            Global Preferences
          </Typography>
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 6 }}>
              <FormControl fullWidth>
                <InputLabel>Date Format (Region)</InputLabel>
                <Select value={dateFormat} label="Date Format (Region)" onChange={(e) => setDateFormat(e.target.value)}>
                  {locales.map((locale) => (
                    <MenuItem key={locale.code} value={locale.code}>
                      {locale.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <FormControl fullWidth>
                <InputLabel>Default Currency</InputLabel>
                <Select value={currency} label="Default Currency" onChange={(e) => setCurrency(e.target.value)}>
                  {currencies.map((curr) => (
                    <MenuItem key={curr.code} value={curr.code}>
                      {curr.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </Paper>
      )}

      {tabValue === 1 && (
        <Paper sx={{ p: 4 }}>
          <Typography variant="h6" gutterBottom>
            Global Checklist Items
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            These items will be available to import into any trip checklist.
          </Typography>

          <Box display="flex" gap={2} mb={4}>
            <TextField
              size="small"
              label="Category"
              value={newChecklistCategory}
              onChange={(e) => setNewChecklistCategory(e.target.value)}
              sx={{ width: 200 }}
            />
            <TextField
              size="small"
              label="New Checklist Task"
              fullWidth
              value={newChecklistTask}
              onChange={(e) => setNewChecklistTask(e.target.value)}
            />
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => {
                if (newChecklistTask.trim()) {
                  createChecklistMutation.mutate({ task: newChecklistTask, category: newChecklistCategory })
                }
              }}
              disabled={!newChecklistTask.trim()}
            >
              Add
            </Button>
          </Box>

          <Divider sx={{ mb: 3 }} />

          <List sx={{ bgcolor: "background.paper", borderRadius: 1 }}>
            {checklistTemplates?.map((template) => (
              <ListItem
                key={template.id}
                secondaryAction={
                  <IconButton edge="end" onClick={() => deleteChecklistMutation.mutate(template.id)}>
                    <DeleteIcon color="error" />
                  </IconButton>
                }
              >
                <ListItemText
                  primary={template.task}
                  secondary={
                    <Chip label={template.category} size="small" sx={{ mt: 0.5 }} variant="outlined" color="primary" />
                  }
                />
              </ListItem>
            ))}
            {checklistTemplates?.length === 0 && (
              <Typography variant="body2" align="center" py={4} color="text.secondary">
                No global checklist items yet.
              </Typography>
            )}
          </List>
        </Paper>
      )}

      {tabValue === 2 && (
        <Paper sx={{ p: 4 }}>
          <Typography variant="h6" gutterBottom>
            Global Packing Items
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            These items will be available to import into any trip packing list.
          </Typography>

          <Box display="flex" gap={2} mb={4}>
            <TextField
              size="small"
              label="Category"
              value={newPackingCategory}
              onChange={(e) => setNewPackingCategory(e.target.value)}
              sx={{ width: 200 }}
            />
            <TextField
              size="small"
              label="New Packing Item"
              fullWidth
              value={newPackingItem}
              onChange={(e) => setNewPackingItem(e.target.value)}
            />
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => {
                if (newPackingItem.trim()) {
                  createPackingMutation.mutate({ item: newPackingItem, category: newPackingCategory })
                }
              }}
              disabled={!newPackingItem.trim()}
            >
              Add
            </Button>
          </Box>

          <Divider sx={{ mb: 3 }} />

          <List sx={{ bgcolor: "background.paper", borderRadius: 1 }}>
            {packingTemplates?.map((template) => (
              <ListItem
                key={template.id}
                secondaryAction={
                  <IconButton edge="end" onClick={() => deletePackingMutation.mutate(template.id)}>
                    <DeleteIcon color="error" />
                  </IconButton>
                }
              >
                <ListItemText
                  primary={template.item}
                  secondary={
                    <Chip
                      label={template.category}
                      size="small"
                      sx={{ mt: 0.5 }}
                      variant="outlined"
                      color="secondary"
                    />
                  }
                />
              </ListItem>
            ))}
            {packingTemplates?.length === 0 && (
              <Typography variant="body2" align="center" py={4} color="text.secondary">
                No global packing items yet.
              </Typography>
            )}
          </List>
        </Paper>
      )}
    </Box>
  )
}

export default SettingsPage
