import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  List,
  ListItem,
  ListItemText,
  Typography,
  Box,
  Tabs,
  Tab,
} from "@mui/material"
import React, { useState, useContext } from "react"

import SavedFeaturesContext from "../../contexts/SavedFeaturesContext"

interface AddFeatureModalProps {
  open: boolean
  onClose: () => void
  onAddFeature: (feature: unknown) => void
  dayDate: string
}

export const AddFeatureModal: React.FC<AddFeatureModalProps> = ({ open, onClose, onAddFeature, dayDate }) => {
  const { savedFeatures } = useContext(SavedFeaturesContext)!
  const [selectedList, setSelectedList] = useState<string>(Object.keys(savedFeatures)[0] || "")

  const lists = Object.keys(savedFeatures)

  const handleAddFeature = (feature: unknown) => {
    onAddFeature(feature)
    onClose()
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        Add Feature to
        {dayDate}
      </DialogTitle>
      <DialogContent>
        {lists.length === 0 ? (
          <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 4 }}>
            No saved features found. Save some features from the map first!
          </Typography>
        ) : (
          <Box>
            <Tabs
              value={selectedList}
              onChange={(_, newValue) => setSelectedList(newValue)}
              variant="scrollable"
              scrollButtons="auto"
              sx={{ borderBottom: 1, borderColor: "divider", mb: 2 }}
            >
              {lists.map((listName) => (
                <Tab key={listName} label={listName} value={listName} />
              ))}
            </Tabs>
            <List sx={{ maxHeight: 400, overflow: "auto" }}>
              {((savedFeatures[selectedList] as unknown[]) || []).map((feature, index: number) => {
                const props = (feature as Record<string, unknown>).properties as Record<string, unknown> | undefined
                // eslint-disable-next-line react/prop-types
                const primaryText = String((props && (props.name || props.title)) || "Unnamed Feature")
                // eslint-disable-next-line react/prop-types
                const secondaryText = String((props && (props.description || props.address)) || "")
                return (
                  <ListItem
                    key={index}
                    sx={{
                      border: 1,
                      borderColor: "divider",
                      borderRadius: 1,
                      mb: 1,
                      cursor: "pointer",
                      "&:hover": { bgcolor: "action.hover" },
                    }}
                    onClick={() => handleAddFeature(feature)}
                  >
                    <ListItemText primary={primaryText} secondary={secondaryText} />
                  </ListItem>
                )
              })}
            </List>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
      </DialogActions>
    </Dialog>
  )
}
