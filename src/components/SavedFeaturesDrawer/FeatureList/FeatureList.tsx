import { List, ListItem, ListItemText, Collapse, Button } from "@mui/material"
import React, { useEffect, useState } from "react"

import { SavedFeaturesStateType, selectionInfo } from "../../../contexts/SavedFeaturesContext"
import { GeoJsonFeature } from "../../../data/types"
import idxFeat, { idxSel } from "../../../utils/idxFeat"
import NoteEditor from "../../NoteEditor/NoteEditor"

import { SortableFeatureItem } from "./SortableFeatureItem"

interface FeatureListProps {
  items: Array<{ feature: GeoJsonFeature; originalIndex: number }>
  setSavedFeatures: {
    (newState: SavedFeaturesStateType): void
    (updater: (prev: SavedFeaturesStateType) => SavedFeaturesStateType): void
  }
  selectedTab: string
  selectedFeature: selectionInfo | null
  setSelectedFeature: (selection: selectionInfo | null) => void
  handleContextMenu: (event: React.MouseEvent | React.TouchEvent, selection: selectionInfo) => void
  excludedProperties: string[]
}

export const FeatureList = ({
  items,
  setSavedFeatures,
  selectedTab,
  selectedFeature,
  setSelectedFeature,
  handleContextMenu,
  excludedProperties,
}: FeatureListProps) => {
  const [editorVisible, setEditorVisible] = useState(false)
  const [notes, setNotes] = useState("")

  const openCloseEditor = (feature: GeoJsonFeature) => {
    if (!editorVisible) {
      setNotes(feature.properties?.tripNotes || "")
      setEditorVisible(true)
    } else {
      setEditorVisible(false)
      setNotes("")
    }
  }

  const handleNotesChange = (content: string) => {
    setNotes(content)
  }

  const handleSaveNotes = () => {
    if (selectedFeature) {
      setSavedFeatures((prev) => {
        const newFeatures = [...prev[selectedTab]]
        // Note: selectedFeature.index is originalIndex. Find by that.
        const featureToUpdate = newFeatures[selectedFeature.index]
        if (featureToUpdate && featureToUpdate.properties) {
          featureToUpdate.properties.tripNotes = notes
        }
        return { ...prev, [selectedTab]: newFeatures }
      })
    }
  }

  useEffect(() => {
    if (!selectedFeature && editorVisible) {
      setEditorVisible(false)
      setNotes("")
    }
  }, [editorVisible, selectedFeature, setNotes, setEditorVisible])

  return (
    <List>
      {items.map(
        (
          item, // Changed to items.map; mapIndex is not strictly needed if key is stable
        ) => (
          <React.Fragment key={idxFeat(item.originalIndex, item.feature)}>
            <SortableFeatureItem
              feature={item.feature}
              id={idxFeat(item.originalIndex, item.feature)} // Use originalIndex for stable ID
              index={item.originalIndex} // Pass originalIndex as index
              selectedTab={selectedTab}
              selectedFeature={selectedFeature}
              setSelectedFeature={setSelectedFeature}
              handleContextMenu={handleContextMenu}
            />
            <Collapse
              in={idxSel(selectedFeature) === idxFeat(item.originalIndex, item.feature)}
              timeout="auto"
              unmountOnExit
            >
              <ListItem sx={{ pl: 4 }}>
                <Button onClick={() => openCloseEditor(item.feature)}>Add/edit notes</Button>
              </ListItem>
              {editorVisible && (
                <>
                  <ListItem sx={{ pl: 4 }}>
                    <NoteEditor
                      key={idxFeat(item.originalIndex, item.feature)}
                      initialText={notes}
                      onChange={handleNotesChange}
                    />
                  </ListItem>
                  <ListItem sx={{ pl: 4 }}>
                    <Button onClick={handleSaveNotes}>Save notes</Button>
                  </ListItem>
                </>
              )}
              <List component="div" disablePadding>
                {Object.entries(item.feature.properties || {})
                  .filter(([key]) => !excludedProperties.includes(key))
                  .map(([key, value]) => (
                    <ListItem key={key} sx={{ pl: 4 }}>
                      <ListItemText primary={`${key}: ${value}`} />
                    </ListItem>
                  ))}
              </List>
            </Collapse>
          </React.Fragment>
        ),
      )}
    </List>
  )
}
