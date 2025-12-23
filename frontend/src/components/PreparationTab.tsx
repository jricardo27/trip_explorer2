import { Checklist as ChecklistIcon, Inventory as PackingIcon, Description as DocIcon } from "@mui/icons-material"
import { Box, Tabs, Tab, Paper } from "@mui/material"
import { useState } from "react"

import { useLanguageStore } from "../stores/languageStore"
import type { Trip } from "../types"

import DocumentsPanel from "./DocumentsPanel"
import PackingPanel from "./PackingPanel"
import PreparationPanel from "./PreparationPanel"

interface PreparationTabProps {
  trip: Trip
}

export const PreparationTab = ({ trip }: PreparationTabProps) => {
  const { t } = useLanguageStore()
  const [tabValue, setTabValue] = useState(0)

  // For now, let's assume edit permission if it's not a viewer role.
  // In a real app, this should come from the parent or a context.
  const canEdit = true

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
          <Tab icon={<ChecklistIcon />} label={t("checklist")} iconPosition="start" />
          <Tab icon={<PackingIcon />} label={t("packingList")} iconPosition="start" />
          <Tab icon={<DocIcon />} label={t("documentsLinks")} iconPosition="start" />
        </Tabs>
      </Paper>

      <Box>
        {tabValue === 0 && <PreparationPanel tripId={trip.id} canEdit={canEdit} />}
        {tabValue === 1 && <PackingPanel tripId={trip.id} canEdit={canEdit} />}
        {tabValue === 2 && <DocumentsPanel tripId={trip.id} canEdit={canEdit} />}
      </Box>
    </Box>
  )
}
