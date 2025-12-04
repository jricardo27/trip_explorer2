import * as XLSX from "xlsx"

import { Trip, DayLocation, TripFeature } from "../../contexts/TripContext"

interface TripExportData {
  trip: Trip
  locations: Record<string, DayLocation[]>
  features: Record<string, TripFeature[]>
}

export const exportTripToExcel = (data: TripExportData) => {
  const { trip, locations, features } = data

  const rows: unknown[] = []

  // Add header row
  rows.push([
    "Day",
    "Date",
    "Order",
    "Type",
    "Name",
    "Location",
    "Notes/Description",
    "Start Time",
    "End Time",
    "Transport Mode",
    "Transport Details",
    "Duration (min)",
    "Cost",
    "Latitude",
    "Longitude",
  ])

  trip.days?.forEach((day) => {
    const dayLocs = locations[day.id] || []
    const dayFeats = features[day.id] || []

    // Combine and sort by visit_order
    const allItems: Array<{ type: "location"; data: DayLocation } | { type: "feature"; data: TripFeature }> = [
      ...dayLocs.map((loc) => ({ type: "location" as const, data: loc })),
      ...dayFeats.map((feat) => ({ type: "feature" as const, data: feat })),
    ].sort((a, b) => (a.data.visit_order || 0) - (b.data.visit_order || 0))

    allItems.forEach((item) => {
      if (item.type === "location") {
        const loc = item.data
        rows.push([
          day.day_index + 1,
          new Date(day.date).toLocaleDateString(),
          loc.visit_order || "",
          "Location",
          loc.city || loc.town || "Unknown",
          `${loc.city || loc.town || ""}, ${loc.country}`,
          loc.notes || "",
          loc.start_time || "",
          loc.end_time || "",
          loc.transport_mode || "",
          loc.transport_details || "",
          loc.duration_minutes || "",
          loc.transport_cost || "",
          loc.latitude || "",
          loc.longitude || "",
        ])
      } else {
        const feat = item.data
        const coords = feat.geometry?.coordinates
        rows.push([
          day.day_index + 1,
          new Date(day.date).toLocaleDateString(),
          feat.visit_order || "",
          "Feature",
          feat.properties.name || "Unknown",
          (feat.properties.address as string) || "",
          (feat.properties.description as string) || "",
          feat.start_time || "",
          feat.end_time || "",
          feat.transport_mode || "",
          feat.transport_details || "",
          feat.duration_minutes || "",
          feat.transport_cost || "",
          coords ? coords[1] : "",
          coords ? coords[0] : "",
        ])
      }
    })
  })

  // Create worksheet
  const ws = XLSX.utils.aoa_to_sheet(rows as unknown[][])

  // Set column widths
  ws["!cols"] = [
    { wch: 5 }, // Day
    { wch: 12 }, // Date
    { wch: 6 }, // Order
    { wch: 10 }, // Type
    { wch: 25 }, // Name
    { wch: 30 }, // Location
    { wch: 40 }, // Notes
    { wch: 10 }, // Start Time
    { wch: 10 }, // End Time
    { wch: 15 }, // Transport Mode
    { wch: 25 }, // Transport Details
    { wch: 12 }, // Duration
    { wch: 8 }, // Cost
    { wch: 12 }, // Latitude
    { wch: 12 }, // Longitude
  ]

  // Create workbook
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, "Itinerary")

  // Add summary sheet
  const summaryRows: unknown[] = [
    ["Trip Summary"],
    [""],
    ["Trip Name:", trip.name],
    ["Start Date:", new Date(trip.start_date).toLocaleDateString()],
    ["End Date:", new Date(trip.end_date).toLocaleDateString()],
    ["Total Days:", trip.days?.length || 0],
    [""],
    ["Statistics"],
    [""],
  ]

  // Calculate totals
  let totalCost = 0
  let totalDuration = 0
  trip.days?.forEach((day) => {
    const dayLocs = locations[day.id] || []
    const dayFeats = features[day.id] || []
    ;[...dayLocs, ...dayFeats].forEach((item) => {
      if (item.transport_cost) totalCost += Number(item.transport_cost)
      if (item.duration_minutes) totalDuration += Number(item.duration_minutes)
    })
  })

  summaryRows.push(
    ["Total Transport Cost:", `$${totalCost.toFixed(2)}`],
    ["Total Travel Time:", `${Math.floor(totalDuration / 60)}h ${totalDuration % 60}m`],
  )

  const summaryWs = XLSX.utils.aoa_to_sheet(summaryRows as unknown[][])
  summaryWs["!cols"] = [{ wch: 20 }, { wch: 30 }]
  XLSX.utils.book_append_sheet(wb, summaryWs, "Summary")

  // Download
  XLSX.writeFile(wb, `${trip.name.replace(/[^a-z0-9]/gi, "_")}_trip.xlsx`)
}
