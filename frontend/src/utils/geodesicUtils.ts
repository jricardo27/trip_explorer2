/**
 * Utility functions for geodesic (Great Circle) calculations
 * Used for creating curved paths on the map
 */

// Convert degrees to radians
const toRad = (deg: number) => (deg * Math.PI) / 180

// Convert radians to degrees
const toDeg = (rad: number) => (rad * 180) / Math.PI

/**
 * Calculates an intermediate point on a Great Circle path between two points
 * @param start Start coordinates [lat, lng]
 * @param end End coordinates [lat, lng]
 * @param fraction Fraction of distance (0.0 to 1.0)
 * @returns Intermediate coordinates [lat, lng]
 */
export const getGreatCirclePoint = (
  start: [number, number],
  end: [number, number],
  fraction: number,
): [number, number] => {
  if (fraction <= 0) return start
  if (fraction >= 1) return end
  if (start[0] === end[0] && start[1] === end[1]) return start

  const lat1 = toRad(start[0])
  const lon1 = toRad(start[1])
  const lat2 = toRad(end[0])
  const lon2 = toRad(end[1])

  // Distance between points (angular distance)
  const d =
    2 *
    Math.asin(
      Math.sqrt(
        Math.pow(Math.sin((lat1 - lat2) / 2), 2) +
          Math.cos(lat1) * Math.cos(lat2) * Math.pow(Math.sin((lon1 - lon2) / 2), 2),
      ),
    )

  if (d === 0) return start

  const A = Math.sin((1 - fraction) * d) / Math.sin(d)
  const B = Math.sin(fraction * d) / Math.sin(d)

  const x = A * Math.cos(lat1) * Math.cos(lon1) + B * Math.cos(lat2) * Math.cos(lon2)
  const y = A * Math.cos(lat1) * Math.sin(lon1) + B * Math.cos(lat2) * Math.sin(lon2)
  const z = A * Math.sin(lat1) + B * Math.sin(lat2)

  const lat = Math.atan2(z, Math.sqrt(x * x + y * y))
  const lon = Math.atan2(y, x)

  return [toDeg(lat), toDeg(lon)]
}

/**
 * Generates a set of points representing a Great Circle path
 * @param start Start coordinates [lat, lng]
 * @param end End coordinates [lat, lng]
 * @param numPoints Number of intermediate points to generate (excluding start/end)
 * @returns Array of coordinates including start and end
 */
export const getGreatCirclePath = (
  start: [number, number],
  end: [number, number],
  numPoints: number = 20,
): [number, number][] => {
  const path: [number, number][] = [start]
  for (let i = 1; i <= numPoints; i++) {
    path.push(getGreatCirclePoint(start, end, i / (numPoints + 1)))
  }
  path.push(end)
  return path
}
