import { useCallback } from "react"

import { DEFAULT_CATEGORY, SavedFeaturesStateType, selectionInfo } from "../../../contexts/SavedFeaturesContext"
import idxFeat, { idxSel } from "../../../utils/idxFeat"

interface UseFeatureManagement {
  handleDuplicate: () => void
  handleRemoveFromList: () => void
  handleRemoveCompletely: () => void
}

export const useFeatureManagement = (
  setSavedFeatures: {
    (newState: SavedFeaturesStateType): void
    (updater: (prev: SavedFeaturesStateType) => SavedFeaturesStateType): void
  },
  selectedTab: string,
  contextMenuFeature: selectionInfo | null,
  removeFeature: (listName: string, selection: selectionInfo | null) => void,
): UseFeatureManagement => {
  const handleDuplicate = useCallback(() => {
    if (contextMenuFeature) {
      setSavedFeatures((prev: SavedFeaturesStateType) => ({
        ...prev,
        [selectedTab]: [...prev[selectedTab], contextMenuFeature.feature],
      }))
    }
  }, [contextMenuFeature, selectedTab, setSavedFeatures])

  const handleRemoveFromList = useCallback(() => {
    if (contextMenuFeature && selectedTab !== DEFAULT_CATEGORY) {
      removeFeature(selectedTab, contextMenuFeature)
      setSavedFeatures((prev: SavedFeaturesStateType) => ({
        ...prev,
        [DEFAULT_CATEGORY]: [...prev[DEFAULT_CATEGORY], contextMenuFeature.feature],
      }))
    }
  }, [contextMenuFeature, selectedTab, removeFeature, setSavedFeatures])

  const handleRemoveCompletely = useCallback(() => {
    if (contextMenuFeature) {
      removeFeature(selectedTab, contextMenuFeature)
      setSavedFeatures((prev: SavedFeaturesStateType) => ({
        ...prev,
        [DEFAULT_CATEGORY]: prev[DEFAULT_CATEGORY].filter(
          (f, index) => idxFeat(index, f) !== idxSel(contextMenuFeature),
        ),
      }))
    }
  }, [contextMenuFeature, selectedTab, removeFeature, setSavedFeatures])

  return {
    handleDuplicate,
    handleRemoveFromList,
    handleRemoveCompletely,
  }
}
