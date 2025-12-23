import { randomUUID } from "crypto"

import { Activity, Prisma, ActivityType, ActivityStatus } from "@prisma/client"

import prisma from "../utils/prisma"

import highlightsService from "./HighlightsService"

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
    participantIds?: string[]
    availableDays?: string[]
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
        availableDays: data.availableDays || [],
        participants: data.participantIds
          ? {
              create: data.participantIds.map((memberId) => ({ memberId })),
            }
          : undefined,
      },
      include: {
        tripDay: true,
        participants: {
          include: {
            member: true,
          },
        },
      },
    })

    // Update highlights aggregations
    const trip = await prisma.trip.findUnique({ where: { id: data.tripId } })
    if (trip) {
      await highlightsService.updateAggregationsForActivity(trip.userId, {
        tripId: data.tripId,
        city: data.city,
        country: data.country,
        countryCode: data.countryCode,
        latitude: data.latitude,
        longitude: data.longitude,
        scheduledStart: data.scheduledStart,
      })
    }

    return activity
  }

  async getActivityById(id: string): Promise<Activity | null> {
    const activity = await prisma.activity.findUnique({
      where: { id },
      include: {
        tripDay: true,
        participants: {
          include: {
            member: true,
          },
        },
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
        participants: {
          include: {
            member: true,
          },
        },
      },
    })

    return activities
  }

  async updateActivity(id: string, data: Partial<Activity>) {
    const activity = await prisma.activity.findUnique({ where: { id } })
    if (!activity) throw new Error("Activity not found")

    // Fields that should sync across linked activities
    const syncFields = [
      "name",
      "description",
      "notes",
      "activityType",
      "location",
      "address",
      "city",
      "country",
      "latitude",
      "longitude",
      "url",
      "phone",
      "email",
      "website",
      "estimatedCost",
      "currency",
      "isLocked",
      "activitySubtype",
      "category",
    ]

    // Perform the update
    const updated = await prisma.activity.update({
      where: { id },
      data: data as any,
      include: { tripDay: true },
    })

    // If linked, propagate distinct fields to others
    if (activity.linkedGroupId) {
      const propData: any = {}
      let hasPropUpdates = false

      for (const key of Object.keys(data)) {
        if (syncFields.includes(key)) {
          propData[key] = data[key as keyof Activity]
          hasPropUpdates = true
        }
      }

      if (hasPropUpdates) {
        await prisma.activity.updateMany({
          where: {
            linkedGroupId: activity.linkedGroupId,
            id: { not: id }, // Skip self
          },
          data: propData,
        })
      }
    }

    // Update highlights aggs
    const trip = await prisma.trip.findUnique({ where: { id: updated.tripId } })
    if (trip) {
      await highlightsService.updateAggregationsForActivity(trip.userId, {
        tripId: updated.tripId,
        city: updated.city,
        country: updated.country,
        countryCode: updated.countryCode,
        latitude: updated.latitude,
        longitude: updated.longitude,
        scheduledStart: updated.scheduledStart,
      })
    }

    return updated
  }

  async deleteActivity(id: string, userId: string): Promise<void> {
    // Verify ownership through trip
    const activity = await prisma.activity.findUnique({
      where: { id },
      include: { trip: true },
    })

    if (!activity || activity.trip.userId !== userId) {
      throw new Error("Activity not found or unauthorized")
    }

    await prisma.activity.delete({
      where: { id },
    })
  }

  async copyActivity(id: string, targetDayId?: string, asLink: boolean = false): Promise<Activity> {
    const source = await prisma.activity.findUnique({
      where: { id },
      include: { participants: true },
    })
    if (!source) throw new Error("Activity not found")

    let linkedGroupId = source.linkedGroupId

    if (asLink) {
      // If linking and no group exists, create one
      if (!linkedGroupId) {
        linkedGroupId = randomUUID()
        await prisma.activity.update({
          where: { id: source.id },
          data: { linkedGroupId },
        })
      }
    } else {
      // If not linking, ensure new is independent
      linkedGroupId = null
    }

    // Target day
    const tripDayId = targetDayId || source.tripDayId

    // Order index
    const lastActivity = await prisma.activity.findFirst({
      where: { tripDayId },
      orderBy: { orderIndex: "desc" },
    })
    const orderIndex = lastActivity ? lastActivity.orderIndex + 1 : 0

    // Create copy
    const copy = await prisma.activity.create({
      data: {
        tripId: source.tripId,
        tripDayId,
        activityType: source.activityType,
        name: asLink ? source.name : `${source.name} (Copy)`,
        description: source.description,
        notes: source.notes,
        scheduledStart: source.scheduledStart,
        scheduledEnd: source.scheduledEnd,
        durationMinutes: source.durationMinutes,
        latitude: source.latitude,
        longitude: source.longitude,
        city: source.city,
        country: source.country,
        countryCode: source.countryCode,
        estimatedCost: source.estimatedCost,
        currency: source.currency,
        isLocked: source.isLocked,
        orderIndex,
        linkedGroupId,
        phone: source.phone,
        email: source.email,
        website: source.website,
        availableDays: source.availableDays,
        participants: {
          create: source.participants.map((p) => ({ memberId: p.memberId })),
        },
      },
      include: {
        tripDay: true,
        participants: { include: { member: true } },
      },
    })

    return copy
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

  async addParticipant(activityId: string, memberId: string) {
    // Check if both exist
    const activity = await prisma.activity.findUnique({ where: { id: activityId } })
    const member = await prisma.tripMember.findUnique({ where: { id: memberId } })

    if (!activity || !member) {
      throw new Error("Activity or Member not found")
    }

    if (activity.tripId !== member.tripId) {
      throw new Error("Activity and Member must belong to the same trip")
    }

    return prisma.activityParticipant.create({
      data: {
        activityId,
        memberId,
      },
      include: {
        member: true,
      },
    })
  }

  async removeParticipant(activityId: string, memberId: string) {
    const participant = await prisma.activityParticipant.findUnique({
      where: {
        activityId_memberId: {
          activityId,
          memberId,
        },
      },
    })

    if (!participant) {
      return // Already removed or didn't exist
    }

    await prisma.activityParticipant.delete({
      where: {
        activityId_memberId: {
          activityId,
          memberId,
        },
      },
    })
  }
}

export default new ActivityService()
