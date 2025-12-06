import { Trip, Prisma } from "@prisma/client"

import prisma from "../utils/prisma"

export class TripService {
  async createTrip(data: {
    userId: string
    name: string
    startDate: Date
    endDate: Date
    budget?: number
    defaultCurrency?: string
    timezone?: string
  }): Promise<Trip> {
    const dayCount = Math.ceil((data.endDate.getTime() - data.startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1

    const trip = await prisma.trip.create({
      data: {
        userId: data.userId,
        name: data.name,
        startDate: data.startDate,
        endDate: data.endDate,
        budget: data.budget,
        defaultCurrency: data.defaultCurrency || "AUD",
        timezone: data.timezone || "Australia/Sydney",
        days: {
          create: Array.from({ length: dayCount }, (_, i) => {
            const date = new Date(data.startDate)
            date.setDate(date.getDate() + i)
            return {
              dayIndex: i,
              date: date,
              name: `Day ${i + 1}`,
            }
          }),
        },
      },
      include: {
        days: true,
      },
    })

    return trip
  }

  async getTripById(id: string, userId: string): Promise<Trip | null> {
    const trip = await prisma.trip.findFirst({
      where: {
        id,
        userId,
      },
      include: {
        days: {
          orderBy: { dayIndex: "asc" },
          include: {
            activities: {
              orderBy: [{ orderIndex: "asc" }, { scheduledStart: "asc" }],
            },
          },
        },
        activities: {
          orderBy: [{ orderIndex: "asc" }, { scheduledStart: "asc" }],
        },
        members: true,
        budgets: true,
      },
    })

    return trip
  }

  async listTrips(
    userId: string,
    filters?: {
      isCompleted?: boolean
      startAfter?: Date
      endBefore?: Date
    },
  ): Promise<Trip[]> {
    const where: Prisma.TripWhereInput = {
      userId,
    }

    if (filters?.isCompleted !== undefined) {
      where.isCompleted = filters.isCompleted
    }

    if (filters?.startAfter) {
      where.startDate = { gte: filters.startAfter }
    }

    if (filters?.endBefore) {
      where.endDate = { lte: filters.endBefore }
    }

    const trips = await prisma.trip.findMany({
      where,
      include: {
        days: true,
      },
      orderBy: {
        startDate: "desc",
      },
    })

    return trips
  }

  async updateTrip(
    id: string,
    userId: string,
    data: Partial<{
      name: string
      startDate: Date
      endDate: Date
      budget: number
      defaultCurrency: string
      timezone: string
      isCompleted: boolean
      isPublic: boolean
    }>,
  ): Promise<Trip> {
    const trip = await prisma.trip.update({
      where: {
        id,
        userId,
      },
      data,
      include: {
        days: true,
      },
    })

    return trip
  }

  async deleteTrip(id: string, userId: string): Promise<void> {
    await prisma.trip.delete({
      where: {
        id,
        userId,
      },
    })
  }

  async copyTrip(tripId: string, userId: string, newName: string, newStartDate: Date): Promise<Trip> {
    const originalTrip = await prisma.trip.findFirst({
      where: { id: tripId, userId },
      include: {
        days: true,
        activities: true,
        budgets: true,
      },
    })

    if (!originalTrip) {
      throw new Error("Trip not found")
    }

    const duration = originalTrip.endDate.getTime() - originalTrip.startDate.getTime()
    const newEndDate = new Date(newStartDate.getTime() + duration)

    const newTrip = await prisma.trip.create({
      data: {
        userId,
        name: newName,
        startDate: newStartDate,
        endDate: newEndDate,
        budget: originalTrip.budget,
        defaultCurrency: originalTrip.defaultCurrency,
        timezone: originalTrip.timezone,
        days: {
          create: originalTrip.days.map((day, i) => {
            const date = new Date(newStartDate)
            date.setDate(date.getDate() + i)
            return {
              dayIndex: day.dayIndex,
              date: date,
              name: day.name,
              notes: day.notes,
            }
          }),
        },
        budgets: {
          create: originalTrip.budgets.map((budget) => ({
            category: budget.category,
            amount: budget.amount,
            currency: budget.currency,
            alertThresholdPercentage: budget.alertThresholdPercentage,
            notes: budget.notes,
          })),
        },
      },
      include: {
        days: true,
      },
    })

    return newTrip
  }
}

export default new TripService()
