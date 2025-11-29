import { useCallback, useMemo, useState } from "react"

import { SavedFeaturesStateType, selectionInfo } from "../../../contexts/SavedFeaturesContext"
import { GeoJsonFeature } from "../../../data/types"

interface UseFeatureSelection {
  selectedFeature: selectionInfo | null
  setSelectedFeature: (selection: selectionInfo | null) => void
  itemsWithOriginalIndex: Array<{ feature: GeoJsonFeature; originalIndex: number }>
}

export const useFeatureSelection = (
  savedFeatures: SavedFeaturesStateType,
  selectedTab: string,
): UseFeatureSelection => {
  const [selectedFeature, setSelectedFeature] = useState<selectionInfo | null>(null)

  const itemsWithOriginalIndex = useMemo(() => {
    if (!savedFeatures || !savedFeatures[selectedTab]) return []
    return savedFeatures[selectedTab].map((feature, index) => ({
      feature,
      originalIndex: index,
    }))
  }, [savedFeatures, selectedTab])

  const setSelectedFeatureCallback = useCallback((selection: selectionInfo | null) => {
    setSelectedFeature((prev) => (prev === selection ? null : selection))
  }, [])

  return {
    selectedFeature,
    setSelectedFeature: setSelectedFeatureCallback,
    itemsWithOriginalIndex,
  }
}
