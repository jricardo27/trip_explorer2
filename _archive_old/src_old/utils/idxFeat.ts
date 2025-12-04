import { selectionInfo } from "../contexts/SavedFeaturesContext"
import { GeoJsonFeature } from "../data/types"

const idxFeat = (index: number, feature: GeoJsonFeature) => {
  return `${index}=${feature.properties?.id}`
}

export const idxSel = (selection: selectionInfo | null) => {
  if (selection) return idxFeat(selection.index, selection.feature)

  return ""
}

export default idxFeat
