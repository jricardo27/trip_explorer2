import { TransportMode } from "@prisma/client"
import axios from "axios"

import prisma from "../utils/prisma"

export class TransportService {
  private apiKey: string

  constructor() {
    this.apiKey = process.env.GOOGLE_MAPS_API_KEY || ""
    if (!this.apiKey) {
      console.warn("GOOGLE_MAPS_API_KEY is not set. Transport auto-fill will fail.")
    }
  }

  async createTransport(input: any) {
    const { splits, splitType, ...data } = input
    if (!data.name) {
      data.name = data.transportMode || "Transport"
    }
    const transport = await prisma.transportAlternative.create({
      data,
    })

    if (data.cost && splits && splits.length > 0) {
      await prisma.expense.create({
        data: {
          tripId: data.tripId,
          transportAlternativeId: transport.id,
          description: `Transport: ${data.name}`,
          category: "Transport",
          amount: data.cost,
          currency: data.currency || "AUD",
          splitType: splitType || "equal",
          isPaid: false,
          splits: {
            create: splits.map((s: any) => ({
              memberId: s.memberId,
              amount: s.amount || 0,
              percentage: s.percentage,
            })),
          },
        },
      })
    }

    return transport
  }

  async listTransportByTrip(tripId: string) {
    return prisma.transportAlternative.findMany({
      where: { tripId },
      orderBy: { createdAt: "desc" },
    })
  }

  async getTransportById(id: string) {
    return prisma.transportAlternative.findUnique({
      where: { id },
    })
  }

  async updateTransport(id: string, input: any) {
    const { splits, splitType, ...data } = input
    const transport = await prisma.transportAlternative.update({
      where: { id },
      data,
    })

    if (data.cost !== undefined) {
      const existingExpense = await prisma.expense.findFirst({
        where: { transportAlternativeId: id },
      })

      if (data.cost && splits && splits.length > 0) {
        if (existingExpense) {
          await prisma.expense.update({
            where: { id: existingExpense.id },
            data: {
              amount: data.cost,
              currency: data.currency,
              splitType: splitType || "equal",
              splits: {
                deleteMany: {},
                create: splits.map((s: any) => ({
                  memberId: s.memberId,
                  amount: s.amount || 0,
                  percentage: s.percentage,
                })),
              },
            },
          })
        } else {
          await prisma.expense.create({
            data: {
              tripId: transport.tripId,
              transportAlternativeId: id,
              description: `Transport: ${transport.name}`,
              category: "Transport",
              amount: data.cost,
              currency: data.currency || "AUD",
              splitType: splitType || "equal",
              isPaid: false,
              splits: {
                create: splits.map((s: any) => ({
                  memberId: s.memberId,
                  amount: s.amount || 0,
                  percentage: s.percentage,
                })),
              },
            },
          })
        }
      } else if (existingExpense && (data.cost === null || (splits && splits.length === 0))) {
        // If cost removed or splits removed, maybe delete the expense?
        // For now, if cost is explicit null or 0, we can delete or update to 0.
        // Let's delete if cost is removed.
        await prisma.expense.delete({ where: { id: existingExpense.id } })
      }
    }

    return transport
  }

  async deleteTransport(id: string) {
    return prisma.transportAlternative.delete({
      where: { id },
    })
  }

  async selectTransport(id: string) {
    const transport = await prisma.transportAlternative.findUnique({
      where: { id },
    })

    if (!transport) {
      throw new Error("Transport not found")
    }

    // Deselect others for the same segment
    await prisma.transportAlternative.updateMany({
      where: {
        tripId: transport.tripId,
        fromActivityId: transport.fromActivityId,
        toActivityId: transport.toActivityId,
        id: { not: id },
      },
      data: { isSelected: false },
    })

    // Select this one
    return prisma.transportAlternative.update({
      where: { id },
      data: { isSelected: true },
    })
  }

  async deselectAll(tripId: string, fromActivityId: string, toActivityId: string) {
    return prisma.transportAlternative.updateMany({
      where: {
        tripId,
        fromActivityId,
        toActivityId,
      },
      data: { isSelected: false },
    })
  }

  async autoFillTripTransport(tripId: string): Promise<void> {
    // 1. Fetch trip and activities properly ordered
    const trip = await prisma.trip.findFirst({
      where: { id: tripId },
      include: {
        days: {
          orderBy: { dayIndex: "asc" },
          include: {
            activities: {
              where: { scenario: null }, // Only main plan
              orderBy: [{ orderIndex: "asc" }, { scheduledStart: "asc" }],
            },
          },
        },
      },
    })

    if (!trip) throw new Error("Trip not found")

    // Flatten activities into a single chronological list
    const activities = trip.days.flatMap((day) => day.activities)

    console.log(`Auto-filling transport for ${activities.length} activities in trip ${tripId}`)

    if (activities.length < 2) return

    // 2. Iterate pairs
    for (let i = 0; i < activities.length - 1; i++) {
      const from = activities[i]
      const to = activities[i + 1]

      console.log(`Checking pair: ${from.name} -> ${to.name}`)

      // Check if both have coordinates
      if (from.latitude && from.longitude && to.latitude && to.longitude) {
        const origin = `${from.latitude},${from.longitude}`
        const destination = `${to.latitude},${to.longitude}`

        // 3. Fetch for different modes
        // Google Modes: driving, walking, bicycling, transit
        const modes = ["driving", "walking", "transit", "bicycling"]

        for (const mode of modes) {
          try {
            const routes = await this.fetchRoute(origin, destination, mode)

            for (const route of routes) {
              const transportMode = this.mapGoogleModeToPrisma(mode)

              let displayName = this.formatModeName(mode)
              if (mode === "transit" && route.transitVehicles && route.transitVehicles.length > 0) {
                displayName = route.transitVehicles.join(" + ")
              }

              // 4. Save to DB
              // Check if a similar one exists
              // We include the specific name in the check to distinguish "Bus" from "Train"
              const finalName = `${displayName} (${route.durationText})`

              const existing = await prisma.transportAlternative.findFirst({
                where: {
                  tripId,
                  fromActivityId: from.id,
                  toActivityId: to.id,
                  transportMode: transportMode,
                  name: finalName,
                  // source: "GOOGLE_AUTOFILL", // Optional
                },
              })

              if (!existing) {
                await prisma.transportAlternative.create({
                  data: {
                    tripId,
                    fromActivityId: from.id,
                    toActivityId: to.id,
                    transportMode,
                    name: finalName,
                    durationMinutes: Math.ceil(route.durationValue / 60),
                    distanceMeters: route.distanceValue,
                    description: route.summary || `Route via ${displayName}`,
                    waypoints: {
                      overview: route.polyline,
                      segments: route.segments,
                    },
                    isSelected: false,
                    costPerPerson: false,
                    requiresBooking: false,
                    isFeasible: true,
                  },
                })
              }
            }
          } catch (err) {
            console.error(`Failed to fetch ${mode} route for ${from.id}->${to.id}:`, err)
            // Continue to next mode/pair
          }
        }
      }
    }
  }

  async fetchSegmentTransport(
    tripId: string,
    fromActivityId: string,
    toActivityId: string,
    options: { modes?: string[]; departureTime?: number },
  ) {
    const fromActivity = await prisma.activity.findUnique({ where: { id: fromActivityId } })
    const toActivity = await prisma.activity.findUnique({ where: { id: toActivityId } })

    if (!fromActivity || !toActivity) throw new Error("Activities not found")
    if (!fromActivity.latitude || !fromActivity.longitude || !toActivity.latitude || !toActivity.longitude) {
      throw new Error("Activities must have coordinates")
    }

    const origin = `${fromActivity.latitude},${fromActivity.longitude}`
    const destination = `${toActivity.latitude},${toActivity.longitude}`
    const modes = options.modes || ["transit", "driving", "walking"]
    const results = []

    for (const mode of modes) {
      try {
        const routes = await this.fetchRoute(origin, destination, mode, options.departureTime)
        for (const route of routes) {
          const transportMode = this.mapGoogleModeToPrisma(mode)
          let displayName = this.formatModeName(mode)
          if (mode === "transit" && route.transitVehicles && route.transitVehicles.length > 0) {
            displayName = route.transitVehicles.join(" + ")
          }

          const finalName = `${displayName} (${route.durationText})`

          // Check for existing
          const existing = await prisma.transportAlternative.findFirst({
            where: {
              tripId,
              fromActivityId: fromActivity.id,
              toActivityId: toActivity.id,
              transportMode,
              name: finalName,
            },
          })

          if (!existing) {
            const created = await prisma.transportAlternative.create({
              data: {
                tripId,
                fromActivityId: fromActivity.id,
                toActivityId: toActivity.id,
                transportMode,
                name: finalName,
                durationMinutes: Math.ceil(route.durationValue / 60),
                distanceMeters: route.distanceValue,
                description: route.summary || `Route via ${displayName}`,
                waypoints: {
                  overview: route.polyline,
                  segments: route.segments,
                },
                isSelected: false,
                costPerPerson: false,
                requiresBooking: false,
                isFeasible: true,
              },
            })
            results.push(created)
          } else {
            results.push(existing)
          }
        }
      } catch (err) {
        console.error(`Failed to fetch ${mode} route for segment:`, err)
      }
    }
    return results
  }

  private async fetchRoute(origin: string, destination: string, mode: string, departureTime?: number) {
    if (!this.apiKey) return []

    const baseUrl = "https://maps.googleapis.com/maps/api/directions/json"
    let url = `${baseUrl}?origin=${origin}&destination=${destination}&mode=${mode}&alternatives=true&key=${this.apiKey}`

    if (departureTime) {
      url += `&departure_time=${departureTime}`
    } else if (mode === "transit") {
      url += "&departure_time=now"
    }

    const response = await axios.get(url)
    const data = response.data

    if (data.status === "OK" && data.routes && data.routes.length > 0) {
      return data.routes.map((route: any) => {
        const leg = route.legs[0]
        const transitVehicles: string[] = []

        if (mode === "transit" && leg.steps) {
          leg.steps.forEach((step: any) => {
            if (step.travel_mode === "TRANSIT" && step.transit_details?.line?.vehicle?.name) {
              const vehicleName = step.transit_details.line.vehicle.name
              if (!transitVehicles.includes(vehicleName)) {
                transitVehicles.push(vehicleName)
              }
            }
          })
        }

        const segments = leg.steps.map((step: any) => ({
          polyline: step.polyline.points,
          mode: step.travel_mode,
          duration: step.duration.text,
          distance: step.distance.text,
          instructions: step.html_instructions,
          transit: step.transit_details
            ? {
                vehicle: step.transit_details.line?.vehicle?.name,
                line: step.transit_details.line?.short_name || step.transit_details.line?.name,
                color: step.transit_details.line?.color,
                textColor: step.transit_details.line?.text_color,
                departureStop: step.transit_details.departure_stop?.name,
                arrivalStop: step.transit_details.arrival_stop?.name,
              }
            : null,
        }))

        return {
          durationValue: leg.duration.value,
          durationText: leg.duration.text,
          distanceValue: leg.distance.value,
          distanceText: leg.distance.text,
          summary: route.summary,
          polyline: route.overview_polyline.points,
          transitVehicles,
          segments,
        }
      })
    }
    return []
  }

  private mapGoogleModeToPrisma(googleMode: string): TransportMode {
    switch (googleMode) {
      case "driving":
        return "DRIVING"
      case "walking":
        return "WALKING"
      case "bicycling":
        return "CYCLING"
      case "transit":
        return "TRANSIT"
      default:
        return "OTHER"
    }
  }

  private formatModeName(mode: string): string {
    return mode.charAt(0).toUpperCase() + mode.slice(1)
  }
}

export default new TransportService()
