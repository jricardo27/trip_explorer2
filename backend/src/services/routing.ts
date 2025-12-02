import axios from "axios"

interface RouteRequest {
  from: { lat: number; lng: number }
  to: { lat: number; lng: number }
  mode?: "driving" | "walking" | "cycling"
}

interface RouteResponse {
  duration_minutes: number
  distance_meters: number
  geometry: {
    type: "LineString"
    coordinates: number[][]
  }
  waypoints?: Array<{ lat: number; lng: number }>
}

// Using public OSRM instance (or can be self-hosted)
const OSRM_BASE_URL = process.env.OSRM_URL || "https://router.project-osrm.org"

/**
 * Calculate route using OSRM (Open Source Routing Machine)
 * Free alternative to Google Maps Directions API
 */
export async function calculateRoute(request: RouteRequest): Promise<RouteResponse> {
  try {
    const { from, to, mode = "driving" } = request

    // OSRM uses lng,lat format (not lat,lng!)
    const coordinates = `${from.lng},${from.lat};${to.lng},${to.lat}`

    // Determine OSRM profile based on mode
    const profile = mode === "walking" ? "foot" : mode === "cycling" ? "bike" : "car"

    const url = `${OSRM_BASE_URL}/route/v1/${profile}/${coordinates}`

    const response = await axios.get(url, {
      params: {
        overview: "full",
        geometries: "geojson",
        steps: false,
      },
      timeout: 10000, // 10 second timeout
    })

    if (response.data.code !== "Ok" || !response.data.routes?.[0]) {
      throw new Error("No route found")
    }

    const route = response.data.routes[0]

    return {
      duration_minutes: Math.ceil(route.duration / 60), // Convert seconds to minutes
      distance_meters: Math.round(route.distance),
      geometry: route.geometry,
      waypoints: route.geometry.coordinates.map((coord: number[]) => ({
        lng: coord[0],
        lat: coord[1],
      })),
    }
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.code === "ECONNABORTED") {
        throw new Error("Route calculation timed out")
      }
      if (error.response?.status === 429) {
        throw new Error("Rate limit exceeded - please try again later")
      }
    }

    console.error("Error calculating route:", error)
    throw new Error("Failed to calculate route")
  }
}

/**
 * Calculate multiple route alternatives with different modes
 */
export async function calculateRouteAlternatives(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number },
): Promise<RouteResponse[]> {
  const modes: Array<"driving" | "walking" | "cycling"> = ["driving", "walking", "cycling"]

  const results = await Promise.allSettled(modes.map((mode) => calculateRoute({ from, to, mode })))

  return results
    .filter((result): result is PromiseFulfilledResult<RouteResponse> => result.status === "fulfilled")
    .map((result) => result.value)
}

/**
 * Estimate route duration based on straight-line distance
 * Fallback when OSRM is unavailable
 */
export function estimateRouteDuration(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number },
  mode: "driving" | "walking" | "cycling" = "driving",
): number {
  // Calculate straight-line distance using Haversine formula
  const R = 6371e3 // Earth radius in meters
  const φ1 = (from.lat * Math.PI) / 180
  const φ2 = (to.lat * Math.PI) / 180
  const Δφ = ((to.lat - from.lat) * Math.PI) / 180
  const Δλ = ((to.lng - from.lng) * Math.PI) / 180

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  const distance = R * c // Distance in meters

  // Apply detour factor (routes are rarely straight lines)
  const detourFactor = 1.3

  // Average speeds (km/h)
  const speeds = {
    driving: 50,
    cycling: 15,
    walking: 5,
  }

  const speed = speeds[mode]
  const adjustedDistance = distance * detourFactor
  const durationHours = adjustedDistance / 1000 / speed
  const durationMinutes = Math.ceil(durationHours * 60)

  return durationMinutes
}
