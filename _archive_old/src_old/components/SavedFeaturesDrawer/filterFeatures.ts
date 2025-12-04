import { GeoJsonFeature } from "../../data/types"

export const filterFeatures = (
  items: Array<{ feature: GeoJsonFeature; originalIndex: number }>,
  searchQuery: string,
): Array<{ feature: GeoJsonFeature; originalIndex: number }> => {
  if (!searchQuery) {
    return items
  }
  const query = searchQuery.toLowerCase()
  return items.filter((item) => {
    if (!item.feature?.properties) {
      return false
    }

    const nameMatch = item.feature.properties.name?.toLowerCase().includes(query) ?? false
    const descriptionMatch = item.feature.properties.description?.toLowerCase().includes(query) ?? false
    return nameMatch || descriptionMatch
  })
}
