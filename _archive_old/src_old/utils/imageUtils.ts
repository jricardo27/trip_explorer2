/**
 * Utility functions for handling feature images and thumbnails
 */

/**
 * Get a thumbnail URL for a feature based on its properties or category
 * @param properties Feature properties
 * @returns Image URL
 */
export const getFeatureThumbnail = (properties: Record<string, unknown>): string | null => {
  // 1. Check for explicit image property
  if (properties.image && typeof properties.image === "string") {
    return properties.image
  }

  if (properties.thumbnail && typeof properties.thumbnail === "string") {
    return properties.thumbnail
  }

  if (properties.photo && typeof properties.photo === "string") {
    return properties.photo
  }

  // 2. Return null to indicate no image (UI should show icon instead)
  // We avoid using external placeholder services to prevent broken images/tracking
  return null
}

/**
 * Get a placeholder image URL based on category (optional usage)
 * @param type Feature type/category
 * @returns Placeholder image URL
 */
export const getCategoryPlaceholder = (type?: string): string => {
  if (!type) return "https://placehold.co/100x100?text=Loc"

  const lowerType = type.toLowerCase()
  let text = "Place"
  let color = "808080" // Grey

  if (lowerType.includes("hotel")) {
    text = "Hotel"
    color = "1976d2" // Blue
  } else if (lowerType.includes("restaurant") || lowerType.includes("food")) {
    text = "Food"
    color = "ed6c02" // Orange
  } else if (lowerType.includes("park") || lowerType.includes("nature")) {
    text = "Park"
    color = "2e7d32" // Green
  } else if (lowerType.includes("museum")) {
    text = "Museum"
    color = "9c27b0" // Purple
  } else if (lowerType.includes("shop")) {
    text = "Shop"
    color = "d32f2f" // Red
  }

  return `https://placehold.co/100x100/${color}/ffffff?text=${text}`
}
