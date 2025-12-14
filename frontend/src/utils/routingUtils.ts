/**
 * Routing utility functions for path interpolation
 * Can be extended to fetch routes from routing APIs
 */

/**
 * Interpolate a point along a path
 * @param path Array of points forming the path
 * @param fraction Progress along path (0 to 1)
 * @returns Point at the given fraction
 */
export function interpolateAlongPath(path: [number, number][], fraction: number): [number, number] {
  if (path.length === 0) return [0, 0]
  if (path.length === 1) return path[0]
  if (fraction <= 0) return path[0]
  if (fraction >= 1) return path[path.length - 1]

  // Calculate total path length
  let totalLength = 0
  const segmentLengths: number[] = []

  for (let i = 0; i < path.length - 1; i++) {
    const dx = path[i + 1][1] - path[i][1]
    const dy = path[i + 1][0] - path[i][0]
    const length = Math.sqrt(dx * dx + dy * dy)
    segmentLengths.push(length)
    totalLength += length
  }

  // Find target distance
  const targetDistance = fraction * totalLength
  let currentDistance = 0

  // Find segment containing target point
  for (let i = 0; i < segmentLengths.length; i++) {
    if (currentDistance + segmentLengths[i] >= targetDistance) {
      // Interpolate within this segment
      const segmentFraction = (targetDistance - currentDistance) / segmentLengths[i]
      const lat = path[i][0] + (path[i + 1][0] - path[i][0]) * segmentFraction
      const lng = path[i][1] + (path[i + 1][1] - path[i][1]) * segmentFraction
      return [lat, lng]
    }
    currentDistance += segmentLengths[i]
  }

  return path[path.length - 1]
}

/**
 * Fetch route from routing API (placeholder for future implementation)
 * @param start Start point [lat, lng]
 * @param end End point [lat, lng]
 * @param mode Transport mode
 * @returns Route path or null
 */
export async function fetchRoute(
  start: [number, number],
  end: [number, number],
  mode?: string,
): Promise<[number, number][] | null> {
  // Placeholder - can be implemented with OSRM, Mapbox, or other routing APIs
  // For now, return null to use geodesic paths
  console.log("Route fetching not implemented, using geodesic path", { start, end, mode })
  return null
}
