import {
  Dialog,
  DialogTitle,
  DialogContent,
  Grid2,
  Paper,
  Typography,
  Box,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Tabs,
  Tab,
} from "@mui/material"
import React, { useMemo, useState } from "react"
import { MdCheckCircle, MdCancel, MdAddCircle, MdClose } from "react-icons/md"

import { Trip, DayLocation, TripFeature } from "../../contexts/TripContext"

interface TripComparisonModalProps {
  open: boolean
  onClose: () => void
  trip: Trip
  dayLocations: Record<string, DayLocation[]>
  dayFeatures: Record<string, TripFeature[]>
}

export const TripComparisonModal: React.FC<TripComparisonModalProps> = ({
  open,
  onClose,
  dayLocations,
  dayFeatures,
}) => {
  const [tabValue, setTabValue] = useState(0)

  const stats = useMemo(() => {
    const allItems: (DayLocation | TripFeature)[] = []
    Object.values(dayLocations).forEach((locs) => allItems.push(...locs))
    Object.values(dayFeatures).forEach((feats) => allItems.push(...feats))

    const planned = allItems.filter((item) => item.planned)
    const visited = allItems.filter((item) => item.visited)

    const plannedAndVisited = planned.filter((item) => item.visited)
    const plannedNotVisited = planned.filter((item) => !item.visited)
    const unplannedVisited = visited.filter((item) => !item.planned)

    return {
      totalPlanned: planned.length,
      totalVisited: visited.length,
      plannedAndVisited,
      plannedNotVisited,
      unplannedVisited,
      completionRate: planned.length > 0 ? Math.round((plannedAndVisited.length / planned.length) * 100) : 0,
      spontaneityRate: visited.length > 0 ? Math.round((unplannedVisited.length / visited.length) * 100) : 0,
    }
  }, [dayLocations, dayFeatures])

  const renderItemList = (items: (DayLocation | TripFeature)[]) => (
    <List dense>
      {items.map((item, idx) => {
        const isLocation = "city" in item
        const name = isLocation
          ? `${(item as DayLocation).city}, ${(item as DayLocation).country}`
          : (item as TripFeature).properties.name || "Unnamed Feature"

        return (
          <ListItem key={idx}>
            <ListItemText primary={name} secondary={isLocation ? "Location" : "Feature"} />
          </ListItem>
        )
      })}
    </List>
  )

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        Plan vs. Actual Comparison
        <IconButton onClick={onClose}>
          <MdClose />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <Grid2 container spacing={2} sx={{ mb: 4 }}>
          <Grid2 size={{ xs: 12, sm: 4 }}>
            <Paper sx={{ p: 2, textAlign: "center", bgcolor: "primary.light", color: "primary.contrastText" }}>
              <Typography variant="h4">{stats.completionRate}%</Typography>
              <Typography variant="subtitle2">Plan Completion</Typography>
            </Paper>
          </Grid2>
          <Grid2 size={{ xs: 12, sm: 4 }}>
            <Paper sx={{ p: 2, textAlign: "center", bgcolor: "success.light", color: "success.contrastText" }}>
              <Typography variant="h4">{stats.totalVisited}</Typography>
              <Typography variant="subtitle2">Total Places Visited</Typography>
            </Paper>
          </Grid2>
          <Grid2 size={{ xs: 12, sm: 4 }}>
            <Paper sx={{ p: 2, textAlign: "center", bgcolor: "secondary.light", color: "secondary.contrastText" }}>
              <Typography variant="h4">{stats.spontaneityRate}%</Typography>
              <Typography variant="subtitle2">Spontaneity Score</Typography>
            </Paper>
          </Grid2>
        </Grid2>

        <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
          <Tabs value={tabValue} onChange={(_e, v) => setTabValue(v)} variant="fullWidth">
            <Tab
              icon={<MdCheckCircle color="green" />}
              label={`Completed (${stats.plannedAndVisited.length})`}
              iconPosition="start"
            />
            <Tab
              icon={<MdCancel color="red" />}
              label={`Missed (${stats.plannedNotVisited.length})`}
              iconPosition="start"
            />
            <Tab
              icon={<MdAddCircle color="purple" />}
              label={`Spontaneous (${stats.unplannedVisited.length})`}
              iconPosition="start"
            />
          </Tabs>
        </Box>

        <Box sx={{ mt: 2 }}>
          {tabValue === 0 && renderItemList(stats.plannedAndVisited)}
          {tabValue === 1 && renderItemList(stats.plannedNotVisited)}
          {tabValue === 2 && renderItemList(stats.unplannedVisited)}
        </Box>
      </DialogContent>
    </Dialog>
  )
}
