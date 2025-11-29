import { Trip, DayLocation } from "../../contexts/TripContext"
import { showError, showSuccess } from "../../utils/notifications"

interface ImportedTripData {
  name: string
  startDate: string
  endDate: string
  days: {
    dayIndex: number
    date: string
    locations: Omit<DayLocation, "id" | "trip_day_id" | "created_at">[]
    features: unknown[]
  }[]
}

/**
 * Parse GeoJSON file exported by this application
 */
const parseGeoJSON = (geoJSON: unknown): ImportedTripData => {
  const data = geoJSON as {
    type: string
    properties?: {
      trip_name?: string
      start_date?: string
      end_date?: string
    }
    features?: Array<{
      type: string
      properties: {
        type?: string
        trip_name?: string
        day_index?: number
        date?: string
        city?: string
        town?: string
        country?: string
        country_code?: string
        notes?: string
        visit_order?: number
        transport_mode?: string
        transport_details?: string
        transport_cost?: number
        duration_minutes?: number
        start_time?: string
        end_time?: string
        [key: string]: unknown
      }
      geometry?: {
        type: string
        coordinates: number[]
      }
    }>
  }

  if (data.type !== "FeatureCollection" || !data.features) {
    throw new Error("Invalid GeoJSON format")
  }

  const tripName = data.properties?.trip_name || "Imported Trip"
  const startDate = data.properties?.start_date || new Date().toISOString().split("T")[0]
  const endDate = data.properties?.end_date || new Date().toISOString().split("T")[0]

  // Group features by day
  const dayMap = new Map<
    number,
    {
      date: string
      locations: Omit<DayLocation, "id" | "trip_day_id" | "created_at">[]
      features: unknown[]
    }
  >()

  data.features.forEach((feature) => {
    const dayIndex = feature.properties.day_index ?? 0
    const date = feature.properties.date || startDate

    if (!dayMap.has(dayIndex)) {
      dayMap.set(dayIndex, { date, locations: [], features: [] })
    }

    const day = dayMap.get(dayIndex)!

    if (feature.properties.type === "location") {
      // This is a location
      const coords = feature.geometry?.coordinates
      if (coords && coords.length >= 2) {
        day.locations.push({
          country: feature.properties.country || "",
          country_code: feature.properties.country_code || "",
          city: feature.properties.city || "",
          town: feature.properties.town,
          latitude: coords[1],
          longitude: coords[0],
          visit_order: feature.properties.visit_order || 0,
          notes: feature.properties.notes,
          transport_mode: feature.properties.transport_mode,
          transport_details: feature.properties.transport_details,
          transport_cost: feature.properties.transport_cost,
          duration_minutes: feature.properties.duration_minutes,
          start_time: feature.properties.start_time,
          end_time: feature.properties.end_time,
        })
      }
    } else {
      // This is a saved feature
      // Remove trip-specific properties before adding
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { type, trip_name, day_index, date, visit_order, ...cleanProperties } = feature.properties
      day.features.push({
        type: "Feature",
        properties: cleanProperties,
        geometry: feature.geometry,
      })
    }
  })

  // Convert map to array
  const days = Array.from(dayMap.entries())
    .sort(([a], [b]) => a - b)
    .map(([dayIndex, dayData]) => ({
      dayIndex,
      date: dayData.date,
      locations: dayData.locations,
      features: dayData.features,
    }))

  return {
    name: tripName,
    startDate,
    endDate,
    days,
  }
}

/**
 * Parse KML file exported by this application
 */
const parseKML = (kmlText: string): ImportedTripData => {
  const parser = new DOMParser()
  const xmlDoc = parser.parseFromString(kmlText, "text/xml")

  // Check for parsing errors
  const parserError = xmlDoc.querySelector("parsererror")
  if (parserError) {
    throw new Error("Invalid KML format")
  }

  // Get trip name and description
  const docName = xmlDoc.querySelector("Document > name")?.textContent || "Imported Trip"
  const description = xmlDoc.querySelector("Document > description")?.textContent || ""

  // Extract dates from description (format: "Trip from YYYY-MM-DD to YYYY-MM-DD")
  const dateMatch = description.match(/from (\d{4}-\d{2}-\d{2}) to (\d{4}-\d{2}-\d{2})/)
  const startDate = dateMatch?.[1] || new Date().toISOString().split("T")[0]
  const endDate = dateMatch?.[2] || new Date().toISOString().split("T")[0]

  const days: ImportedTripData["days"] = []

  // Parse folders (each folder is a day)
  const folders = xmlDoc.querySelectorAll("Document > Folder")
  folders.forEach((folder, index) => {
    const folderName = folder.querySelector("name")?.textContent || ""
    // Extract day index and date from folder name (format: "Day 1 - YYYY-MM-DD")
    const dayMatch = folderName.match(/Day (\d+) - (.+)/)
    const dayIndex = dayMatch ? parseInt(dayMatch[1]) - 1 : index
    const date = dayMatch?.[2] || startDate

    const locations: Omit<DayLocation, "id" | "trip_day_id" | "created_at">[] = []
    const features: unknown[] = []

    // Parse placemarks in this folder
    const placemarks = folder.querySelectorAll("Placemark")
    placemarks.forEach((placemark, order) => {
      const name = placemark.querySelector("name")?.textContent || ""
      const desc = placemark.querySelector("description")?.textContent || ""
      const coordsText = placemark.querySelector("Point > coordinates")?.textContent?.trim()

      if (coordsText) {
        const [lng, lat] = coordsText.split(",").map(Number)

        // Try to determine if this is a location or feature
        // Locations typically have city names, features have more descriptive names
        // For simplicity, we'll treat all as features since we can't reliably distinguish
        features.push({
          type: "Feature",
          properties: {
            name,
            description: desc,
            id: `imported-${Date.now()}-${order}`,
          },
          geometry: {
            type: "Point",
            coordinates: [lng, lat],
          },
        })
      }
    })

    days.push({
      dayIndex,
      date,
      locations,
      features,
    })
  })

  return {
    name: docName,
    startDate,
    endDate,
    days,
  }
}

/**
 * Import a trip from GeoJSON or KML file
 */
export const importTrip = async (
  createTrip: (name: string, startDate: string, endDate: string) => Promise<Trip>,
  addLocationToDay: (dayId: string, location: Omit<DayLocation, "id" | "trip_day_id" | "created_at">) => Promise<void>,
  addFeatureToDay: (dayId: string, feature: unknown) => Promise<void>,
) => {
  const input = document.createElement("input")
  input.type = "file"
  input.accept = ".geojson,.json,.kml"

  input.onchange = async (event: Event) => {
    const target = event.target as HTMLInputElement
    if (!target.files || target.files.length === 0) return

    const file = target.files[0]
    const fileExtension = file.name.split(".").pop()?.toLowerCase()

    try {
      const fileContent = await file.text()
      let tripData: ImportedTripData

      if (fileExtension === "geojson" || fileExtension === "json") {
        const geoJSON = JSON.parse(fileContent)
        tripData = parseGeoJSON(geoJSON)
      } else if (fileExtension === "kml") {
        tripData = parseKML(fileContent)
      } else {
        throw new Error("Unsupported file format. Please use .geojson or .kml files.")
      }

      // Create the trip
      showSuccess(`Importing trip "${tripData.name}"...`)
      const createdTrip = await createTrip(tripData.name, tripData.startDate, tripData.endDate)

      if (!createdTrip.days || createdTrip.days.length === 0) {
        throw new Error("Failed to create trip days")
      }

      // Add locations and features to each day
      for (const importedDay of tripData.days) {
        // Find the corresponding day in the created trip
        const tripDay = createdTrip.days.find((d) => d.day_index === importedDay.dayIndex)
        if (!tripDay) {
          console.warn(`Day ${importedDay.dayIndex} not found in created trip`)
          continue
        }

        // Add locations
        for (const location of importedDay.locations) {
          await addLocationToDay(tripDay.id, location)
        }

        // Add features
        for (const feature of importedDay.features) {
          await addFeatureToDay(tripDay.id, feature)
        }
      }

      showSuccess(`Trip "${tripData.name}" imported successfully!`)
    } catch (error) {
      console.error("Import error:", error)
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred"
      showError(`Failed to import trip: ${errorMessage}`)
    }
  }

  input.click()
}
