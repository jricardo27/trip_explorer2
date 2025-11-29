import { Box, TextField, Button, Typography, Collapse, Stack, Chip } from "@mui/material"
import React, { useState, useMemo, useEffect } from "react"
import { FaFilter } from "react-icons/fa"

import { SavedFeature, SavedFeatures } from "../../../contexts/SavedFeaturesContext"
import { filterFeaturesByType, extractFeatureTypes, FeatureFilters } from "../advancedFilterFeatures"
import { FeatureList } from "../FeatureList/FeatureList"
import { filterFeatures } from "../filterFeatures"
import { useFeatureSelection } from "../hooks/useFeatureSelection"
import { TabList } from "../TabList/TabList"

interface FeatureListViewProps {
  savedFeatures: SavedFeatures
  setSavedFeatures: React.Dispatch<React.SetStateAction<SavedFeatures>>
  selectedTab: string
  handleTabChange: (event: React.SyntheticEvent, newValue: string) => void
  handleTabContextMenu: (event: React.MouseEvent, tab: string) => void
  handleContextMenu: (event: React.MouseEvent, feature: SavedFeature) => void
  selectedFeature: SavedFeature | null
  setSelectedFeature: (feature: SavedFeature | null) => void
}

const excludedProperties = ["id", "images", "style"] as const
const FILTER_STORAGE_KEY = "featureFilters"

export const FeatureListView: React.FC<FeatureListViewProps> = ({
  savedFeatures,
  setSavedFeatures,
  selectedTab,
  handleTabChange,
  handleTabContextMenu,
  handleContextMenu,
  selectedFeature,
  setSelectedFeature,
}) => {
  // Load saved filters from localStorage
  const loadSavedFilters = (): FeatureFilters & { showAdvancedFilters?: boolean } => {
    try {
      const saved = localStorage.getItem(FILTER_STORAGE_KEY)
      if (saved) {
        return JSON.parse(saved)
      }
    } catch (error) {
      console.error("Failed to load saved filters:", error)
    }
    return { searchQuery: "", types: [], tags: [], showAdvancedFilters: false }
  }

  const savedFilters = loadSavedFilters()
  const [searchQuery, setSearchQuery] = useState<string>(savedFilters.searchQuery)
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(savedFilters.showAdvancedFilters || false)
  const [advancedFilters, setAdvancedFilters] = useState<FeatureFilters>({
    searchQuery: savedFilters.searchQuery,
    types: savedFilters.types,
    tags: savedFilters.tags,
  })

  // Save filters to localStorage whenever they change
  useEffect(() => {
    const filtersToSave = {
      ...advancedFilters,
      showAdvancedFilters,
    }
    localStorage.setItem(FILTER_STORAGE_KEY, JSON.stringify(filtersToSave))
  }, [advancedFilters, showAdvancedFilters])

  const { itemsWithOriginalIndex } = useFeatureSelection(savedFeatures, selectedTab)

  const filteredItems = useMemo(() => {
    const basicFiltered = filterFeatures(itemsWithOriginalIndex, searchQuery)
    if (showAdvancedFilters) {
      return filterFeaturesByType(basicFiltered, advancedFilters)
    }
    return basicFiltered
  }, [itemsWithOriginalIndex, searchQuery, showAdvancedFilters, advancedFilters])

  const availableTypes = useMemo(() => extractFeatureTypes(savedFeatures), [savedFeatures])

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value
    setSearchQuery(value)
    setAdvancedFilters((prev) => ({ ...prev, searchQuery: value }))
  }

  const handleTypeToggle = (type: string) => {
    setAdvancedFilters((prev) => ({
      ...prev,
      types: prev.types.includes(type) ? prev.types.filter((t) => t !== type) : [...prev.types, type],
    }))
  }

  return (
    <Box sx={{ display: "flex", flexGrow: 1, overflow: "hidden" }}>
      <Box sx={{ width: 150, bgcolor: "background.paper", borderRight: 1, borderColor: "divider" }}>
        <TabList
          tabs={Object.keys(savedFeatures)}
          selectedTab={selectedTab}
          handleTabChange={handleTabChange}
          handleTabContextMenu={handleTabContextMenu}
        />
      </Box>
      <Box sx={{ flexGrow: 1, display: "flex", flexDirection: "column", height: "100%" }}>
        <Box sx={{ flexGrow: 1, overflowY: "auto", p: 2 }}>
          <TextField
            fullWidth
            label="Search Features"
            variant="outlined"
            value={searchQuery}
            onChange={handleSearchChange}
            sx={{ mb: 1 }}
          />
          <Box sx={{ display: "flex", alignItems: "center", mb: 2, gap: 1 }}>
            <Button
              size="small"
              startIcon={<FaFilter />}
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              variant={showAdvancedFilters ? "contained" : "outlined"}
            >
              Filter by Type
            </Button>
            {advancedFilters.types.length > 0 && (
              <Typography variant="caption" color="text.secondary">
                ({advancedFilters.types.length} selected)
              </Typography>
            )}
          </Box>
          <Collapse in={showAdvancedFilters}>
            <Box sx={{ mb: 2 }}>
              <TextField
                fullWidth
                size="small"
                label="Filter by Location"
                placeholder="Country, state, city, or address..."
                value={advancedFilters.locationQuery || ""}
                onChange={(e) => setAdvancedFilters((prev) => ({ ...prev, locationQuery: e.target.value }))}
                sx={{ mb: 2 }}
              />
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {availableTypes.slice(0, 20).map((type) => (
                  <Chip
                    key={type}
                    label={type}
                    onClick={() => handleTypeToggle(type)}
                    color={advancedFilters.types.includes(type) ? "primary" : "default"}
                    size="small"
                    sx={{ mb: 1 }}
                  />
                ))}
              </Stack>
              {availableTypes.length > 20 && (
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>
                  Showing 20 of {availableTypes.length} types
                </Typography>
              )}
            </Box>
          </Collapse>
          <FeatureList
            items={filteredItems}
            setSavedFeatures={setSavedFeatures}
            selectedTab={selectedTab}
            selectedFeature={selectedFeature}
            setSelectedFeature={setSelectedFeature}
            handleContextMenu={handleContextMenu}
            excludedProperties={Array.from(excludedProperties)}
          />
        </Box>
      </Box>
    </Box>
  )
}
