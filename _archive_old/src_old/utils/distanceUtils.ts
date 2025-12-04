/**
 * Utility functions for calculating distances and travel times between locations
 */

/**
 * Calculate distance between two coordinates using Haversine formula
 * @param lat1 Latitude of first point
 * @param lng1 Longitude of first point
 * @param lat2 Latitude of second point
 * @param lng2 Longitude of second point
 * @returns Distance in kilometers
 */
export const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const R = 6371 // Earth's radius in kilometers
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2)

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  const distance = R * c

  return distance
}

/**
 * Convert degrees to radians
 */
const toRad = (degrees: number): number => {
  return (degrees * Math.PI) / 180
}

/**
 * Format distance for display
 * @param km Distance in kilometers
 * @returns Formatted string (e.g., "15.3 km" or "850 m")
 */
export const formatDistance = (km: number): string => {
  if (km < 1) {
    return `${Math.round(km * 1000)} m`
  }
  return `${km.toFixed(1)} km`
}

/**
 * Estimate travel time based on distance and transport mode
 * @param distanceKm Distance in kilometers
 * @param mode Transport mode (car, walk, bike, bus, etc.)
 * @returns Estimated time in minutes
 */
export const estimateTravelTime = (distanceKm: number, mode?: string): number => {
  // Default speeds in km/h
  const speeds: Record<string, number> = {
    car: 60,
    drive: 60,
    driving: 60,
    walk: 5,
    walking: 5,
    bike: 15,
    cycling: 15,
    bicycle: 15,
    bus: 40,
    train: 80,
    flight: 500,
    plane: 500,
  }

  const normalizedMode = mode?.toLowerCase() || "car"
  const speed = speeds[normalizedMode] || speeds.car

  return Math.round((distanceKm / speed) * 60) // Convert hours to minutes
}

/**
 * Format travel time for display
 * @param minutes Time in minutes
 * @returns Formatted string (e.g., "2h 30m" or "45m")
 */
export const formatTravelTime = (minutes: number): string => {
  if (minutes < 60) {
    return `${minutes}m`
  }
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
}

/**
 * Calculate total distance for a list of items with coordinates
 */
export const calculateTotalDistance = (
  items: Array<{
    latitude?: number
    longitude?: number
    geometry?: { coordinates: number[] }
  }>,
): number => {
  let total = 0

  for (let i = 1; i < items.length; i++) {
    const prev = items[i - 1]
    const curr = items[i]

    const prevLat = prev.latitude ?? prev.geometry?.coordinates[1]
    const prevLng = prev.longitude ?? prev.geometry?.coordinates[0]
    const currLat = curr.latitude ?? curr.geometry?.coordinates[1]
    const currLng = curr.longitude ?? curr.geometry?.coordinates[0]

    if (prevLat && prevLng && currLat && currLng) {
      total += calculateDistance(prevLat, prevLng, currLat, currLng)
    }
  }

  return total
}
