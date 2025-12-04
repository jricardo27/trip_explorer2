import { Activity, Prisma, ActivityType, ActivityStatus } from "@prisma/client"

import prisma from "../utils/prisma"

export class ActivityService {
  async createActivity(data: {
    tripId: string
    tripDayId?: string
    activityType: ActivityType
    name: string
    description?: string
    notes?: string
    scheduledStart?: Date
    scheduledEnd?: Date
    durationMinutes?: number
    city?: string
    country?: string
    countryCode?: string
    estimatedCost?: number
    currency?: string
  }): Promise<Activity> {
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
        city: data.city,
        country: data.country,
        countryCode: data.countryCode,
        estimatedCost: data.estimatedCost,
        currency: data.currency || "AUD",
      },
    })

    return activity
  }

  async getActivityById(id: string): Promise<Activity | null> {
    const activity = await prisma.activity.findUnique({
      where: { id },
      include: {
        participants: {
          include: {
            member: true,
          },
        },
        expenses: true,
        photos: true,
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
      orderBy: [{ scheduledStart: "asc" }, { createdAt: "asc" }],
      include: {
        tripDay: true,
      },
    })

    return activities
  }

  async updateActivity(
    id: string,
    data: Partial<{
      name: string
      description: string
      notes: string
      scheduledStart: Date
      scheduledEnd: Date
      actualStart: Date
      actualEnd: Date
      durationMinutes: number
      status: ActivityStatus
      priority: string
      estimatedCost: number
      actualCost: number
      isPaid: boolean
    }>,
  ): Promise<Activity> {
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

  async reorderActivities(tripDayId: string, activityIds: string[]): Promise<void> {
    // Update scheduled times based on order
    const activities = await prisma.activity.findMany({
      where: {
        id: { in: activityIds },
        tripDayId,
      },
    })

    // This is a simplified version - in production you'd calculate proper times
    for (let i = 0; i < activityIds.length; i++) {
      const activity = activities.find((a) => a.id === activityIds[i])
      if (activity) {
        await prisma.activity.update({
          where: { id: activityIds[i] },
          data: {
            // Update order or times as needed
          },
        })
      }
    }
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
