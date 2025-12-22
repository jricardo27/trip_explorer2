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

  async updateActivity(id: string, data: Prisma.ActivityUpdateInput): Promise<Activity> {
    const activity = await prisma.activity.findUnique({ where: { id } })
    if (!activity) throw new Error("Activity not found")

    const updatedActivity = await prisma.activity.update({
      where: { id },
      data,
    })

    // Propagate changes if soft linked
    if (activity.linkedGroupId) {
      // Fields to sync (exclude ID, tripId, tripDayId, orderIndex, dates if we want them separate)
      // Requirement says "modifications... are applied to all", so let's sync most fields.
      const syncFields = [
        "name",
        "description",
        "notes",
        "address",
        "city",
        "country",
        "countryCode",
        "latitude",
        "longitude",
        "estimatedCost",
        "currency",
        "activityType",
        "activitySubtype",
        "category",
      ]

      const syncData: any = {}
      for (const field of syncFields) {
        if (data[field as keyof typeof data] !== undefined) {
          syncData[field] = data[field as keyof typeof data]
        }
      }

      if (Object.keys(syncData).length > 0) {
        await prisma.activity.updateMany({
          where: {
            linkedGroupId: activity.linkedGroupId,
            id: { not: id },
          },
          data: syncData,
        })
      }
    }

    return updatedActivity
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

  async copyActivity(id: string, userId: string, userEmail?: string): Promise<any> {
    // Get the original activity
    const originalActivity = await prisma.activity.findUnique({
      where: { id },
      include: {
        trip: {
          include: {
            members: {
              where: {
                OR: [{ userId }, { email: userEmail }],
              },
            },
          },
        },
      },
    })

    if (
      !originalActivity ||
      (originalActivity.trip.userId !== userId &&
        !originalActivity.trip.members.some((m) => ["OWNER", "EDITOR"].includes(m.role)))
    ) {
      throw new Error("Activity not found or unauthorized")
    }

    let linkedGroupId = originalActivity.linkedGroupId
    if (!linkedGroupId) {
      // Generate unique group ID
      linkedGroupId = randomUUID()
      // Update original activity with new group ID
      await prisma.activity.update({
        where: { id },
        data: { linkedGroupId },
      })
    }

    // Create a copy with a new ID
    const copiedActivity = await prisma.activity.create({
      data: {
        tripId: originalActivity.tripId,
        tripDayId: originalActivity.tripDayId,
        linkedGroupId: linkedGroupId,
        name: originalActivity.name, // Soft copy: keep name the same (sync will handle it anyway)
        description: originalActivity.description,
        activityType: originalActivity.activityType,
        activitySubtype: originalActivity.activitySubtype,
        category: originalActivity.category,
        scheduledStart: originalActivity.scheduledStart,
        scheduledEnd: originalActivity.scheduledEnd,
        durationMinutes: originalActivity.durationMinutes,
        latitude: originalActivity.latitude,
        longitude: originalActivity.longitude,
        address: originalActivity.address,
        city: originalActivity.city,
        country: originalActivity.country,
        countryCode: originalActivity.countryCode,
        estimatedCost: originalActivity.estimatedCost,
        currency: originalActivity.currency,
        notes: originalActivity.notes,
        availableDays: originalActivity.availableDays,
        orderIndex: originalActivity.orderIndex + 1, // Place after original
      },
    })

    return copiedActivity
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
