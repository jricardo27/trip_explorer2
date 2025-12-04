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
  TextField,
  InputAdornment,
  Grid2,
} from "@mui/material"
import React, { useState, useContext, useMemo, useEffect } from "react"
import { MdSearch } from "react-icons/md"
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet"

import SavedFeaturesContext from "../../contexts/SavedFeaturesContext"

interface AddFeatureModalProps {
  open: boolean
  onClose: () => void
  onAddFeature: (feature: unknown) => void
  dayDate: string
}

const RECENT_FEATURES_KEY = "recentlyAddedFeatures"
const MAX_RECENT_FEATURES = 10

export const AddFeatureModal: React.FC<AddFeatureModalProps> = ({ open, onClose, onAddFeature, dayDate }) => {
  const { savedFeatures } = useContext(SavedFeaturesContext)!
  const [selectedList, setSelectedList] = useState<string>("recent")
  const [searchQuery, setSearchQuery] = useState<string>("")
  const [hoveredFeature, setHoveredFeature] = useState<unknown | null>(null)

  const lists = ["recent", ...Object.keys(savedFeatures)]

  // Load recently added features from localStorage
  const getRecentFeatures = (): string[] => {
    try {
      const saved = localStorage.getItem(RECENT_FEATURES_KEY)
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  }

  const handleAddFeature = (feature: unknown) => {
    // Save to recent features
    const featureId = (feature as { properties?: { id?: string } })?.properties?.id
    if (featureId) {
      const recentIds = getRecentFeatures()
      const updatedRecent = [featureId, ...recentIds.filter((id) => id !== featureId)].slice(0, MAX_RECENT_FEATURES)
      localStorage.setItem(RECENT_FEATURES_KEY, JSON.stringify(updatedRecent))
    }

    onAddFeature(feature)
    onClose()
  }

  const filteredFeatures = useMemo(() => {
    let features: unknown[] = []

    if (selectedList === "recent") {
      // Get recently added features
      const recentIds = getRecentFeatures()
      const allFeatures: unknown[] = []
      Object.values(savedFeatures).forEach((list) => {
        allFeatures.push(...(list as unknown[]))
      })
      features = recentIds
        .map((id) => allFeatures.find((f) => (f as { properties?: { id?: string } })?.properties?.id === id))
        .filter(Boolean)
    } else {
      features = (savedFeatures[selectedList] as unknown[]) || []
    }

    if (!searchQuery) return features

    const query = searchQuery.toLowerCase()
    return features.filter((feature) => {
      const props = (feature as Record<string, unknown>).properties as Record<string, unknown> | undefined
      // eslint-disable-next-line react/prop-types
      const name = String((props && (props.name || props.title)) || "").toLowerCase()
      // eslint-disable-next-line react/prop-types
      const description = String((props && (props.description || props.address)) || "").toLowerCase()
      return name.includes(query) || description.includes(query)
    })
  }, [savedFeatures, selectedList, searchQuery])

  // Get coordinates from hovered feature
  const hoveredCoords = useMemo(() => {
    if (!hoveredFeature) return null
    const geometry = (hoveredFeature as { geometry?: { coordinates?: number[] } })?.geometry
    if (geometry?.coordinates && geometry.coordinates.length >= 2) {
      return {
        lat: geometry.coordinates[1],
        lng: geometry.coordinates[0],
      }
    }
    return null
  }, [hoveredFeature])

  // Reset hover when dialog closes
  useEffect(() => {
    if (!open) {
      setHoveredFeature(null)
    }
  }, [open])

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        Add Feature to
        {dayDate}
      </DialogTitle>
      <DialogContent>
        {lists.length === 1 ? (
          <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 4 }}>
            No saved features found. Save some features from the map first!
          </Typography>
        ) : (
          <Grid2 container spacing={2}>
            <Grid2 size={{ xs: 12, md: hoveredCoords ? 6 : 12 }}>
              <Tabs
                value={selectedList}
                onChange={(_, newValue) => setSelectedList(newValue)}
                variant="scrollable"
                scrollButtons="auto"
                sx={{ borderBottom: 1, borderColor: "divider", mb: 2 }}
              >
                <Tab key="recent" label="Recent" value="recent" />
                {Object.keys(savedFeatures).map((listName) => (
                  <Tab key={listName} label={listName} value={listName} />
                ))}
              </Tabs>
              <TextField
                fullWidth
                size="small"
                placeholder="Search features..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <MdSearch />
                    </InputAdornment>
                  ),
                }}
                sx={{ mb: 2 }}
              />
              <List sx={{ maxHeight: 400, overflow: "auto" }}>
                {filteredFeatures.length === 0 ? (
                  <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 4 }}>
                    {selectedList === "recent"
                      ? "No recently added features."
                      : searchQuery
                        ? "No features match your search."
                        : "No features in this list."}
                  </Typography>
                ) : (
                  filteredFeatures.map((feature, index: number) => {
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
                        onMouseEnter={() => setHoveredFeature(feature)}
                        onMouseLeave={() => setHoveredFeature(null)}
                      >
                        <ListItemText primary={primaryText} secondary={secondaryText} />
                      </ListItem>
                    )
                  })
                )}
              </List>
            </Grid2>
            {hoveredCoords && (
              <Grid2 size={{ xs: 12, md: 6 }}>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Location Preview
                </Typography>
                <Box sx={{ height: 400, border: 1, borderColor: "divider", borderRadius: 1 }}>
                  <MapContainer
                    center={[hoveredCoords.lat, hoveredCoords.lng]}
                    zoom={13}
                    style={{ height: "100%", width: "100%" }}
                  >
                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <Marker position={[hoveredCoords.lat, hoveredCoords.lng]}>
                      <Popup>
                        {String(
                          ((hoveredFeature as Record<string, unknown>)?.properties as Record<string, unknown>)?.name ||
                            "Feature",
                        )}
                      </Popup>
                    </Marker>
                  </MapContainer>
                </Box>
              </Grid2>
            )}
          </Grid2>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
      </DialogActions>
    </Dialog>
  )
}
