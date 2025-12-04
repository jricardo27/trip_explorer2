/**
 * Utility functions for color coding features based on their type/category
 */

/**
 * Get a color based on the feature type or category
 * @param type The type or category of the feature (e.g., "hotel", "restaurant", "park")
 * @returns A Material-UI color string (e.g., "primary.main", "success.main") or hex code
 */
export const getCategoryColor = (type?: string): string => {
  if (!type) return "grey.500"

  const lowerType = type.toLowerCase()

  // Accommodation - Blue
  if (
    lowerType.includes("hotel") ||
    lowerType.includes("hostel") ||
    lowerType.includes("apartment") ||
    lowerType.includes("motel") ||
    lowerType.includes("resort") ||
    lowerType.includes("accommodation")
  ) {
    return "primary.main"
  }

  // Food & Drink - Orange/Warning
  if (
    lowerType.includes("restaurant") ||
    lowerType.includes("cafe") ||
    lowerType.includes("bar") ||
    lowerType.includes("pub") ||
    lowerType.includes("food") ||
    lowerType.includes("dining") ||
    lowerType.includes("bakery")
  ) {
    return "warning.main"
  }

  // Nature & Outdoors - Green/Success
  if (
    lowerType.includes("park") ||
    lowerType.includes("garden") ||
    lowerType.includes("beach") ||
    lowerType.includes("nature") ||
    lowerType.includes("hike") ||
    lowerType.includes("hiking") ||
    lowerType.includes("forest") ||
    lowerType.includes("mountain") ||
    lowerType.includes("lake")
  ) {
    return "success.main"
  }

  // Culture & History - Purple/Secondary
  if (
    lowerType.includes("museum") ||
    lowerType.includes("history") ||
    lowerType.includes("historical") ||
    lowerType.includes("art") ||
    lowerType.includes("gallery") ||
    lowerType.includes("culture") ||
    lowerType.includes("monument") ||
    lowerType.includes("church") ||
    lowerType.includes("temple")
  ) {
    return "secondary.main"
  }

  // Shopping - Pink/Red
  if (
    lowerType.includes("shop") ||
    lowerType.includes("store") ||
    lowerType.includes("mall") ||
    lowerType.includes("market") ||
    lowerType.includes("retail")
  ) {
    return "error.main"
  }

  // Services & Transport - Light Blue/Info
  if (
    lowerType.includes("gas") ||
    lowerType.includes("station") ||
    lowerType.includes("hospital") ||
    lowerType.includes("bank") ||
    lowerType.includes("atm") ||
    lowerType.includes("parking") ||
    lowerType.includes("airport") ||
    lowerType.includes("train") ||
    lowerType.includes("bus")
  ) {
    return "info.main"
  }

  // Entertainment - Deep Purple
  if (
    lowerType.includes("cinema") ||
    lowerType.includes("theater") ||
    lowerType.includes("movie") ||
    lowerType.includes("entertainment") ||
    lowerType.includes("casino")
  ) {
    return "#673ab7" // deepPurple[500]
  }

  // Default
  return "grey.500"
}
