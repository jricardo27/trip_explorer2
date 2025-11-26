import { useCallback, useState } from "react"

import { selectionInfo } from "../../../contexts/SavedFeaturesContext"

interface UseFeatureSelection {
  selectedFeature: selectionInfo | null
  setSelectedFeature: (selection: selectionInfo | null) => void
}

export const useFeatureSelection = (): UseFeatureSelection => {
  const [selectedFeature, setSelectedFeature] = useState<selectionInfo | null>(null)

  const setSelectedFeatureCallback = useCallback((selection: selectionInfo | null) => {
    setSelectedFeature((prev) => (prev === selection ? null : selection))
  }, [])

  return {
    selectedFeature,
    setSelectedFeature: setSelectedFeatureCallback,
  }
}
