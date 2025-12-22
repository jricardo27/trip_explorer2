import prisma from "../utils/prisma"

class HighlightsService {
  /**
   * Check if a point is inside a GeoJSON geometry
   */
  private isPointInGeometry(lat: number, lng: number, geometry: any): boolean {
    if (!geometry) return false

    if (geometry.type === "Polygon") {
      return this.isPointInPolygon([lng, lat], geometry.coordinates)
    }

    if (geometry.type === "MultiPolygon") {
      return geometry.coordinates.some((polygon: any) => this.isPointInPolygon([lng, lat], polygon))
    }

    return false
  }

  private isPointInPolygon(point: [number, number], polygon: number[][][]): boolean {
    const [lng, lat] = point
    let isInside = false
    const vs = polygon[0] // Exterior ring

    for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
      const xi = vs[i][0],
        yi = vs[i][1]
      const xj = vs[j][0],
        yj = vs[j][1]

      const intersect = yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi
      if (intersect) isInside = !isInside
    }

    return isInside
  }

  /**
   * Reverse geocode coordinates to find country and city
   */
  private async reverseGeocode(latitude: number, longitude: number) {
    // 1. Find country
    const countries = await prisma.country.findMany({
      select: { id: true, code: true, name: true, centroid: true, boundary: true },
    })

    let matchedCountry = null

    // First try exact boundary match
    for (const country of countries) {
      if (this.isPointInGeometry(latitude, longitude, country.boundary)) {
        matchedCountry = country
        break
      }
    }

    // If no boundary match, fall back to nearest centroid
    if (!matchedCountry) {
      let minDistance = Infinity
      for (const country of countries) {
        if (country.centroid && typeof country.centroid === "object") {
          const centroid = country.centroid as any
          const distance = Math.sqrt(Math.pow(centroid.lat - latitude, 2) + Math.pow(centroid.lng - longitude, 2))
          if (distance < minDistance) {
            minDistance = distance
            matchedCountry = country
          }
        }
      }
    }

    if (!matchedCountry) {
      return null
    }

    // 2. Find city
    const cities = await prisma.city.findMany({
      where: { countryId: matchedCountry.id },
      select: { id: true, name: true, latitude: true, longitude: true, boundary: true },
    })

    let matchedCity = null

    // First try exact boundary match
    for (const city of cities) {
      if (city.boundary && this.isPointInGeometry(latitude, longitude, city.boundary)) {
        matchedCity = city
        break
      }
    }

    // If no boundary match, fall back to nearest point
    if (!matchedCity) {
      let minCityDistance = Infinity
      for (const city of cities) {
        const distance = Math.sqrt(Math.pow(city.latitude - latitude, 2) + Math.pow(city.longitude - longitude, 2))
        if (distance < minCityDistance) {
          minCityDistance = distance
          matchedCity = city
        }
      }
    }

    return {
      country: matchedCountry.name,
      countryCode: matchedCountry.code,
      city: matchedCity?.name || null,
    }
  }

  /**
   * Update aggregations when an activity is created or updated
   */
  async updateAggregationsForActivity(
    userId: string,
    activityData: {
      tripId: string
      city?: string | null
      country?: string | null
      countryCode?: string | null
      latitude?: number | null
      longitude?: number | null
      scheduledStart?: Date | null
    },
  ) {
    // If we have coordinates but no city/country info, try to reverse geocode
    if (activityData.latitude && activityData.longitude && (!activityData.city || !activityData.countryCode)) {
      try {
        const location = await this.reverseGeocode(activityData.latitude, activityData.longitude)
        if (location) {
          activityData.city = location.city
          activityData.country = location.country
          activityData.countryCode = location.countryCode

          // Update the activity in DB so we don't have to geocode again
          const activity = await prisma.activity.findFirst({
            where: {
              tripId: activityData.tripId,
              latitude: activityData.latitude,
              longitude: activityData.longitude,
              city: null,
            },
          })

          if (activity) {
            await prisma.activity.update({
              where: { id: activity.id },
              data: {
                city: location.city,
                country: location.country,
                countryCode: location.countryCode,
              },
            })
          }
        }
      } catch (error) {
        console.error("Auto-geocoding failed:", error)
      }
    }

    // 1. Match country
    let country = null
    if (activityData.countryCode) {
      country = await prisma.country.findUnique({
        where: { code: activityData.countryCode },
      })
    }

    // 2. Match or create city
    let city = null
    if (activityData.city && country && activityData.latitude && activityData.longitude) {
      // Try to find existing city
      city = await prisma.city.findFirst({
        where: {
          name: activityData.city,
          countryId: country.id,
        },
      })

      // Create city if not exists
      if (!city) {
        try {
          city = await prisma.city.create({
            data: {
              name: activityData.city,
              countryId: country.id,
              countryCode: activityData.countryCode!,
              latitude: activityData.latitude,
              longitude: activityData.longitude,
            },
          })
        } catch (error) {
          // Ignore duplicate errors
          console.error("Error creating city:", error)
        }
      }
    }

    // 3. Update country visit aggregation
    if (country) {
      await this.incrementCountryVisit(userId, country.id, activityData.scheduledStart || new Date())
    }

    // 4. Update city visit aggregation
    if (city) {
      await this.incrementCityVisit(userId, city.id, activityData.scheduledStart || new Date())
    }

    // 5. Update user travel stats
    await this.updateUserStats(userId)
  }

  /**
   * Increment country visit count
   */
  private async incrementCountryVisit(userId: string, countryId: string, visitDate: Date) {
    const existing = await prisma.userCountryVisit.findUnique({
      where: { userId_countryId: { userId, countryId } },
    })

    if (existing) {
      await prisma.userCountryVisit.update({
        where: { id: existing.id },
        data: {
          activityCount: { increment: 1 },
          lastVisit: visitDate > existing.lastVisit ? visitDate : existing.lastVisit,
        },
      })
    } else {
      await prisma.userCountryVisit.create({
        data: {
          userId,
          countryId,
          visitCount: 1,
          activityCount: 1,
          firstVisit: visitDate,
          lastVisit: visitDate,
        },
      })
    }
  }

  /**
   * Increment city visit count
   */
  private async incrementCityVisit(userId: string, cityId: string, visitDate: Date) {
    const existing = await prisma.userCityVisit.findUnique({
      where: { userId_cityId: { userId, cityId } },
    })

    if (existing) {
      await prisma.userCityVisit.update({
        where: { id: existing.id },
        data: {
          activityCount: { increment: 1 },
          lastVisit: visitDate > existing.lastVisit ? visitDate : existing.lastVisit,
        },
      })
    } else {
      await prisma.userCityVisit.create({
        data: {
          userId,
          cityId,
          visitCount: 1,
          activityCount: 1,
          firstVisit: visitDate,
          lastVisit: visitDate,
        },
      })
    }
  }

  /**
   * Update user travel statistics
   */
  private async updateUserStats(userId: string) {
    const [trips, activities, countries, cities] = await Promise.all([
      prisma.trip.count({ where: { userId } }),
      prisma.activity.count({ where: { trip: { userId } } }),
      prisma.userCountryVisit.count({ where: { userId } }),
      prisma.userCityVisit.count({ where: { userId } }),
    ])

    const firstTrip = await prisma.trip.findFirst({
      where: { userId },
      orderBy: { startDate: "asc" },
    })

    const lastTrip = await prisma.trip.findFirst({
      where: { userId },
      orderBy: { endDate: "desc" },
    })

    await prisma.userTravelStats.upsert({
      where: { userId },
      create: {
        userId,
        totalTrips: trips,
        totalActivities: activities,
        totalCountries: countries,
        totalCities: cities,
        firstTripDate: firstTrip?.startDate,
        lastTripDate: lastTrip?.endDate,
      },
      update: {
        totalTrips: trips,
        totalActivities: activities,
        totalCountries: countries,
        totalCities: cities,
        firstTripDate: firstTrip?.startDate,
        lastTripDate: lastTrip?.endDate,
        lastRecalculated: new Date(),
      },
    })
  }

  /**
   * Get user highlights with all statistics
   */
  async getUserHighlights(userId: string) {
    const stats = await prisma.userTravelStats.findUnique({
      where: { userId },
    })

    const countries = await prisma.userCountryVisit.findMany({
      where: { userId },
      include: {
        country: {
          select: {
            name: true,
            code: true,
            code3: true,
            continent: true,
            region: true,
            boundary: true,
            centroid: true,
          },
        },
      },
      orderBy: { activityCount: "desc" },
    })

    const cities = await prisma.userCityVisit.findMany({
      where: { userId },
      include: {
        city: {
          select: {
            name: true,
            countryCode: true,
            latitude: true,
            longitude: true,
            boundary: true,
            population: true,
          },
        },
      },
      orderBy: { activityCount: "desc" },
    })

    // Get trips with activity counts
    const trips = await prisma.trip.findMany({
      where: { userId },
      select: {
        id: true,
        name: true,
        startDate: true,
        endDate: true,
        _count: {
          select: { activities: true },
        },
      },
      orderBy: { startDate: "desc" },
    })

    // Get activity type breakdown
    const activityTypes = await prisma.activity.groupBy({
      by: ["activityType"],
      where: { trip: { userId } },
      _count: { activityType: true },
      orderBy: { _count: { activityType: "desc" } },
    })

    // Get all activities for map and lists
    const activities = await prisma.activity.findMany({
      where: {
        trip: { userId },
        latitude: { not: null },
        longitude: { not: null },
      },
      select: {
        id: true,
        name: true,
        activityType: true,
        city: true,
        countryCode: true,
        latitude: true,
        longitude: true,
        scheduledStart: true,
        tripId: true,
      },
      orderBy: { scheduledStart: "desc" },
    })

    return {
      statistics: stats || {
        totalTrips: 0,
        totalActivities: 0,
        totalCountries: 0,
        totalCities: 0,
        firstTripDate: null,
        lastTripDate: null,
      },
      countries,
      cities,
      trips: trips.map((trip) => ({
        id: trip.id,
        name: trip.name,
        startDate: trip.startDate,
        endDate: trip.endDate,
        activityCount: trip._count.activities,
      })),
      activityTypes: activityTypes.map((type) => ({
        type: type.activityType,
        count: type._count.activityType,
      })),
      activities,
    }
  }

  /**
   * Recalculate all statistics for a user (for data repair)
   */
  async recalculateUserStats(userId: string) {
    console.log(`Recalculating stats for user ${userId}...`)

    // Clear existing aggregations
    await prisma.userCountryVisit.deleteMany({ where: { userId } })
    await prisma.userCityVisit.deleteMany({ where: { userId } })

    // Get all activities for user's trips with location data
    const activities = await prisma.activity.findMany({
      where: {
        trip: { userId },
        countryCode: { not: null },
      },
      include: {
        trip: true,
      },
    })

    console.log(`Found ${activities.length} activities with location data`)

    // Rebuild aggregations
    for (const activity of activities) {
      await this.updateAggregationsForActivity(userId, {
        tripId: activity.tripId,
        city: activity.city,
        country: activity.country,
        countryCode: activity.countryCode,
        latitude: activity.latitude,
        longitude: activity.longitude,
        scheduledStart: activity.scheduledStart,
      })
    }

    console.log(`✅ Recalculation complete for user ${userId}`)
  }

  /**
   * Populate location data for activities with coordinates but missing location info
   */
  async populateActivityLocations(userId: string) {
    console.log(`Populating location data for user ${userId}...`)

    // Find activities with coordinates but missing location data
    const activities = await prisma.activity.findMany({
      where: {
        trip: { userId },
        latitude: { not: null },
        longitude: { not: null },
        countryCode: null,
      },
    })

    console.log(`Found ${activities.length} activities needing location data`)

    let updated = 0
    let failed = 0

    for (const activity of activities) {
      try {
        const location = await this.reverseGeocode(activity.latitude!, activity.longitude!)

        if (location) {
          await prisma.activity.update({
            where: { id: activity.id },
            data: {
              country: location.country,
              countryCode: location.countryCode,
              city: location.city,
            },
          })

          // Update aggregations for this activity
          await this.updateAggregationsForActivity(userId, {
            tripId: activity.tripId,
            city: location.city,
            country: location.country,
            countryCode: location.countryCode,
            latitude: activity.latitude,
            longitude: activity.longitude,
            scheduledStart: activity.scheduledStart,
          })

          updated++
          if (updated % 10 === 0) {
            console.log(`  ✓ Updated ${updated} activities...`)
          }
        } else {
          failed++
        }
      } catch (error) {
        console.error(`Error processing activity ${activity.id}:`, error)
        failed++
      }
    }

    console.log(`✅ Populated ${updated} activities (${failed} failed)`)
    return { updated, failed, total: activities.length }
  }
}

export default new HighlightsService()
