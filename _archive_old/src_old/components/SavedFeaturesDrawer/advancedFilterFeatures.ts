import { GeoJsonFeature } from "../../data/types"

interface FeatureProperties {
  [key: string]: unknown
}

export interface FeatureFilters {
  searchQuery: string
  types: string[]
  tags: string[]
  locationQuery?: string
}

export const filterFeaturesByType = (
  items: Array<{ feature: GeoJsonFeature; originalIndex: number }>,
  filters: FeatureFilters,
): Array<{ feature: GeoJsonFeature; originalIndex: number }> => {
  return items.filter(({ feature }) => {
    const feat = feature as { properties: FeatureProperties }

    // Search query filter
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase()
      const name = (feat.properties.name as string)?.toLowerCase() || ""
      const description = (feat.properties.description as string)?.toLowerCase() || ""
      const address = (feat.properties.address as string)?.toLowerCase() || ""
      const type = (feat.properties.type as string)?.toLowerCase() || ""

      if (!name.includes(query) && !description.includes(query) && !address.includes(query) && !type.includes(query)) {
        return false
      }
    }

    // Type filter
    if (filters.types.length > 0) {
      const featureType = (feat.properties.type as string)?.toLowerCase() || ""
      const featureCategory = (feat.properties.category as string)?.toLowerCase() || ""
      const featureAmenity = (feat.properties.amenity as string)?.toLowerCase() || ""

      const hasMatchingType = filters.types.some((type) => {
        const lowerType = type.toLowerCase()
        return (
          featureType.includes(lowerType) || featureCategory.includes(lowerType) || featureAmenity.includes(lowerType)
        )
      })

      if (!hasMatchingType) return false
    }

    // Tags filter (if feature has tags property)
    if (filters.tags.length > 0) {
      const featureTags = (feat.properties.tags as string[]) || []
      const hasMatchingTag = filters.tags.some((tag) => featureTags.includes(tag))
      if (!hasMatchingTag) return false
    }

    // Location filter
    if (filters.locationQuery) {
      const query = filters.locationQuery.toLowerCase()
      const country = (feat.properties.country as string)?.toLowerCase() || ""
      const state = (feat.properties.state as string)?.toLowerCase() || ""
      const city = (feat.properties.city as string)?.toLowerCase() || ""
      const address = (feat.properties.address as string)?.toLowerCase() || ""
      const region = (feat.properties.region as string)?.toLowerCase() || ""

      if (
        !country.includes(query) &&
        !state.includes(query) &&
        !city.includes(query) &&
        !address.includes(query) &&
        !region.includes(query)
      ) {
        return false
      }
    }

    return true
  })
}

// Extract unique types from features
export const extractFeatureTypes = (features: Record<string, unknown[]>): string[] => {
  const types = new Set<string>()

  Object.values(features).forEach((featureList) => {
    featureList.forEach((feature) => {
      const feat = feature as { properties: FeatureProperties }
      const type = feat.properties.type as string
      const category = feat.properties.category as string
      const amenity = feat.properties.amenity as string

      if (type) types.add(type)
      if (category) types.add(category)
      if (amenity) types.add(amenity)
    })
  })

  return Array.from(types).sort()
}
