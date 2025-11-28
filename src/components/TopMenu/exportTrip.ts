import { Trip, DayLocation, TripFeature } from "../../contexts/TripContext"

interface TripExportData {
  trip: Trip
  locations: Record<string, DayLocation[]>
  features: Record<string, TripFeature[]>
}

export const exportTripToGeoJSON = (data: TripExportData) => {
  const { trip, locations, features } = data

  const allFeatures: unknown[] = []

  // Add locations as features
  trip.days?.forEach((day) => {
    const dayLocs = locations[day.id] || []
    dayLocs.forEach((loc) => {
      if (loc.latitude && loc.longitude) {
        allFeatures.push({
          type: "Feature",
          properties: {
            type: "location",
            trip_name: trip.name,
            day_index: day.day_index,
            date: day.date,
            city: loc.city,
            town: loc.town,
            country: loc.country,
            country_code: loc.country_code,
            notes: loc.notes,
            visit_order: loc.visit_order,
            transport_mode: loc.transport_mode,
            transport_details: loc.transport_details,
            transport_cost: loc.transport_cost,
            duration_minutes: loc.duration_minutes,
            start_time: loc.start_time,
            end_time: loc.end_time,
          },
          geometry: {
            type: "Point",
            coordinates: [loc.longitude, loc.latitude],
          },
        })
      }
    })

    // Add saved features
    const dayFeats = features[day.id] || []
    dayFeats.forEach((feat) => {
      allFeatures.push({
        ...feat,
        properties: {
          ...feat.properties,
          type: "feature",
          trip_name: trip.name,
          day_index: day.day_index,
          date: day.date,
          visit_order: feat.visit_order,
          transport_mode: feat.transport_mode,
          transport_details: feat.transport_details,
          transport_cost: feat.transport_cost,
          duration_minutes: feat.duration_minutes,
          start_time: feat.start_time,
          end_time: feat.end_time,
        },
      })
    })
  })

  const geoJSON = {
    type: "FeatureCollection",
    properties: {
      trip_name: trip.name,
      start_date: trip.start_date,
      end_date: trip.end_date,
      created_at: trip.created_at,
    },
    features: allFeatures,
  }

  const blob = new Blob([JSON.stringify(geoJSON, null, 2)], { type: "application/json" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = `${trip.name.replace(/[^a-z0-9]/gi, "_")}_trip.geojson`
  link.click()
  URL.revokeObjectURL(url)
}

export const exportTripToKML = (data: TripExportData) => {
  const { trip, locations, features } = data

  let kml = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>${escapeXml(trip.name)}</name>
    <description>Trip from ${trip.start_date} to ${trip.end_date}</description>
`

  trip.days?.forEach((day) => {
    kml += `    <Folder>
      <name>Day ${day.day_index + 1} - ${day.date}</name>
`

    const dayLocs = locations[day.id] || []
    dayLocs.forEach((loc) => {
      if (loc.latitude && loc.longitude) {
        kml += `      <Placemark>
        <name>${escapeXml(loc.city || loc.town || "Location")}</name>
        <description>${escapeXml(loc.notes || "")}</description>
        <Point>
          <coordinates>${loc.longitude},${loc.latitude},0</coordinates>
        </Point>
      </Placemark>
`
      }
    })

    const dayFeats = features[day.id] || []
    dayFeats.forEach((feat) => {
      if (feat.geometry?.coordinates) {
        const coords = feat.geometry.coordinates
        kml += `      <Placemark>
        <name>${escapeXml(feat.properties.name || "Feature")}</name>
        <description>${escapeXml((feat.properties.description as string) || "")}</description>
        <Point>
          <coordinates>${coords[0]},${coords[1]},0</coordinates>
        </Point>
      </Placemark>
`
      }
    })

    kml += `    </Folder>
`
  })

  kml += `  </Document>
</kml>`

  const blob = new Blob([kml], { type: "application/vnd.google-earth.kml+xml" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = `${trip.name.replace(/[^a-z0-9]/gi, "_")}_trip.kml`
  link.click()
  URL.revokeObjectURL(url)
}

function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
}
