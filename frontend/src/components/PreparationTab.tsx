import { Checklist as ChecklistIcon, Inventory as PackingIcon, Description as DocIcon } from "@mui/icons-material"
import { Box, Grid, Tabs, Tab, Paper } from "@mui/material"
import { useState } from "react"

import type { Trip } from "../types"

import { ChecklistPanel } from "./ChecklistPanel"
import { DocumentOrganizer } from "./DocumentOrganizer"
import { PackingListPanel } from "./PackingListPanel"

interface PreparationTabProps {
  trip: Trip
}

export const PreparationTab = ({ trip }: PreparationTabProps) => {
  const [tabValue, setTabValue] = useState(0)

  return (
    <Box>
      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={tabValue}
          onChange={(_, newValue) => setTabValue(newValue)}
          indicatorColor="primary"
          textColor="primary"
          centered
        >
          <Tab icon={<ChecklistIcon />} label="Checklist" iconPosition="start" />
          <Tab icon={<PackingIcon />} label="Packing List" iconPosition="start" />
          <Tab icon={<DocIcon />} label="Documents & Links" iconPosition="start" />
        </Tabs>
      </Paper>

      <Grid container spacing={4}>
        <Grid size={{ xs: 12 }}>
          {tabValue === 0 && <ChecklistPanel trip={trip} />}
          {tabValue === 1 && <PackingListPanel trip={trip} />}
          {tabValue === 2 && <DocumentOrganizer trip={trip} />}
        </Grid>
      </Grid>
    </Box>
  )
}
