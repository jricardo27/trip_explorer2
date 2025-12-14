import { Activity, Prisma, ActivityType, ActivityStatus } from "@prisma/client"

import prisma from "../utils/prisma"

export class ActivityService {
  async createActivity(data: {
    tripId: string
    tripDayId: string // Now required
    activityType: ActivityType
    name: string
    description?: string
    notes?: string
    scheduledStart?: Date
    scheduledEnd?: Date
    durationMinutes?: number
    latitude?: number
    longitude?: number
    city?: string
    country?: string
    countryCode?: string
    estimatedCost?: number
    currency?: string
  }): Promise<Activity> {
    // Calculate next order index
    let orderIndex = 0
    if (data.tripDayId) {
      const lastActivity = await prisma.activity.findFirst({
        where: { tripDayId: data.tripDayId },
        orderBy: { orderIndex: "desc" },
      })
      orderIndex = lastActivity ? lastActivity.orderIndex + 1 : 0
    }

    const activity = await prisma.activity.create({
      data: {
        tripId: data.tripId,
        tripDayId: data.tripDayId,
        activityType: data.activityType,
        name: data.name,
        description: data.description,
        notes: data.notes,
        scheduledStart: data.scheduledStart,
        scheduledEnd: data.scheduledEnd,
        durationMinutes: data.durationMinutes,
        latitude: data.latitude,
        longitude: data.longitude,
        city: data.city,
        country: data.country,
        countryCode: data.countryCode,
        estimatedCost: data.estimatedCost,
        currency: data.currency || "AUD",
        orderIndex,
      },
    })

    return activity
  }

  async getActivityById(id: string): Promise<Activity | null> {
    const activity = await prisma.activity.findUnique({
      where: { id },
      include: {
        tripDay: true,
      },
    })
    return activity
  }

  async listActivitiesByTrip(
    tripId: string,
    filters?: {
      tripDayId?: string
      activityType?: ActivityType
      status?: ActivityStatus
    },
  ): Promise<Activity[]> {
    const where: Prisma.ActivityWhereInput = {
      tripId,
    }

    if (filters?.tripDayId) {
      where.tripDayId = filters.tripDayId
    }

    if (filters?.activityType) {
      where.activityType = filters.activityType
    }

    if (filters?.status) {
      where.status = filters.status
    }

    const activities = await prisma.activity.findMany({
      where,
      orderBy: [{ orderIndex: "asc" }, { scheduledStart: "asc" }, { createdAt: "asc" }],
      include: {
        tripDay: true,
      },
    })

    return activities
  }

  async updateActivity(id: string, data: Prisma.ActivityUpdateInput): Promise<Activity> {
    const activity = await prisma.activity.update({
      where: { id },
      data,
    })
    return activity
  }

  async deleteActivity(id: string): Promise<void> {
    await prisma.activity.delete({
      where: { id },
    })
  }

  async reorderActivities(
    tripId: string,
    updates: { activityId: string; orderIndex: number; tripDayId?: string }[],
  ): Promise<void> {
    await prisma.$transaction(
      updates.map((update) =>
        prisma.activity.update({
          where: { id: update.activityId, tripId }, // Ensure tripId matches for security
          data: {
            orderIndex: update.orderIndex,
            ...(update.tripDayId !== undefined && { tripDayId: update.tripDayId }),
          },
        }),
      ),
    )
  }

  async getConflicts(tripId: string): Promise<
    Array<{
      activity1: Activity
      activity2: Activity
      reason: string
    }>
  > {
    const activities = await prisma.activity.findMany({
      where: {
        tripId,
        scheduledStart: { not: null },
        scheduledEnd: { not: null },
      },
      orderBy: { scheduledStart: "asc" },
    })

    const conflicts: Array<{
      activity1: Activity
      activity2: Activity
      reason: string
    }> = []

    for (let i = 0; i < activities.length; i++) {
      for (let j = i + 1; j < activities.length; j++) {
        const a1 = activities[i]
        const a2 = activities[j]

        if (a1.scheduledStart && a1.scheduledEnd && a2.scheduledStart && a2.scheduledEnd) {
          // Check for overlap
          if (a1.scheduledStart < a2.scheduledEnd && a2.scheduledStart < a1.scheduledEnd) {
            conflicts.push({
              activity1: a1,
              activity2: a2,
              reason: "Time overlap detected",
            })
          }
        }
      }
    }

    return conflicts
  }
}

export default new ActivityService()
