/**
 * Geodesic utility functions for calculating great circle paths
 * Used for smooth curved paths between map points
 */

/**
 * Calculate a point along a great circle path
 * @param p1 Start point [lat, lng]
 * @param p2 End point [lat, lng]
 * @param fraction Progress along path (0 to 1)
 * @returns Point at the given fraction [lat, lng]
 */
export function getGreatCirclePoint(p1: [number, number], p2: [number, number], fraction: number): [number, number] {
  const lat1 = (p1[0] * Math.PI) / 180
  const lon1 = (p1[1] * Math.PI) / 180
  const lat2 = (p2[0] * Math.PI) / 180
  const lon2 = (p2[1] * Math.PI) / 180

  const d =
    2 *
    Math.asin(
      Math.sqrt(
        Math.pow(Math.sin((lat1 - lat2) / 2), 2) +
          Math.cos(lat1) * Math.cos(lat2) * Math.pow(Math.sin((lon1 - lon2) / 2), 2),
      ),
    )

  const a = Math.sin((1 - fraction) * d) / Math.sin(d)
  const b = Math.sin(fraction * d) / Math.sin(d)

  const x = a * Math.cos(lat1) * Math.cos(lon1) + b * Math.cos(lat2) * Math.cos(lon2)
  const y = a * Math.cos(lat1) * Math.sin(lon1) + b * Math.cos(lat2) * Math.sin(lon2)
  const z = a * Math.sin(lat1) + b * Math.sin(lat2)

  const lat = Math.atan2(z, Math.sqrt(x * x + y * y))
  const lon = Math.atan2(y, x)

  return [(lat * 180) / Math.PI, (lon * 180) / Math.PI]
}

/**
 * Generate a smooth great circle path between two points
 * @param p1 Start point [lat, lng]
 * @param p2 End point [lat, lng]
 * @param numPoints Number of intermediate points
 * @returns Array of points forming the path
 */
export function getGreatCirclePath(p1: [number, number], p2: [number, number], numPoints: number): [number, number][] {
  const path: [number, number][] = []

  for (let i = 0; i <= numPoints; i++) {
    const fraction = i / numPoints
    path.push(getGreatCirclePoint(p1, p2, fraction))
  }

  return path
}
