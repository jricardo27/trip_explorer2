import axios from "axios"

const OSRM_BASE_URL = "https://router.project-osrm.org/route/v1"

type TransportMode = "car" | "walk" | "bike" | "bus" | "train" | "flight" | string

/**
 * Maps internal transport modes to OSRM profiles
 */
const getOSRMProfile = (mode?: TransportMode): string | null => {
  if (!mode) return null
  const m = mode.toLowerCase()
  if (m === "car" || m === "taxi" || m === "bus" || m === "drive") return "driving"
  if (m === "walk" || m === "hike" || m === "run") return "walking"
  if (m === "bike" || m === "bicycle" || m === "cycling") return "cycling"
  return null
}

/**
 * Fetches a route from OSRM
 * @param start [lat, lng]
 * @param end [lat, lng]
 * @param mode Transport mode
 * @returns Array of [lat, lng] coordinates or null if not supported/failed
 */
export const fetchRoute = async (
  start: [number, number],
  end: [number, number],
  mode?: TransportMode,
): Promise<[number, number][] | null> => {
  const profile = getOSRMProfile(mode)
  if (!profile) return null // Use fallback (geodesic) for unsupported modes like flight

  try {
    // OSRM expects {lon},{lat}
    const url = `${OSRM_BASE_URL}/${profile}/${start[1]},${start[0]};${end[1]},${end[0]}?overview=full&geometries=geojson`
    const response = await axios.get(url)

    if (response.data.code === "Ok" && response.data.routes && response.data.routes.length > 0) {
      const coordinates = response.data.routes[0].geometry.coordinates
      // OSRM returns [lon, lat], convert to [lat, lon]
      return coordinates.map((coord: [number, number]) => [coord[1], coord[0]])
    }
  } catch (error) {
    console.warn("Failed to fetch route from OSRM:", error)
  }

  return null
}

/**
 * Interpolates a position along a path based on a fraction (0-1)
 * @param path Array of [lat, lng] points
 * @param fraction 0.0 to 1.0
 * @returns [lat, lng]
 */
export const interpolateAlongPath = (path: [number, number][], fraction: number): [number, number] => {
  if (path.length === 0) return [0, 0]
  if (path.length === 1) return path[0]
  if (fraction <= 0) return path[0]
  if (fraction >= 1) return path[path.length - 1]

  // Calculate total distance
  const distances: number[] = []
  let totalDist = 0
  for (let i = 0; i < path.length - 1; i++) {
    const d = Math.sqrt(Math.pow(path[i + 1][0] - path[i][0], 2) + Math.pow(path[i + 1][1] - path[i][1], 2))
    distances.push(d)
    totalDist += d
  }

  if (totalDist === 0) return path[0]

  const targetDist = totalDist * fraction
  let currentDist = 0

  for (let i = 0; i < distances.length; i++) {
    if (currentDist + distances[i] >= targetDist) {
      // Found the segment
      const segmentFraction = (targetDist - currentDist) / distances[i]
      const p1 = path[i]
      const p2 = path[i + 1]
      return [p1[0] + (p2[0] - p1[0]) * segmentFraction, p1[1] + (p2[1] - p1[1]) * segmentFraction]
    }
    currentDist += distances[i]
  }

  return path[path.length - 1]
}
