import { TripDay, Prisma } from "@prisma/client"
import prisma from "../utils/prisma"

export class TripDayService {
  async getTripDay(tripId: string, dayIndex: number): Promise<TripDay | null> {
    const tripDay = await prisma.tripDay.findUnique({
      where: {
        tripId_dayIndex: {
          tripId,
          dayIndex,
        },
      },
      include: {
        activities: {
          orderBy: { scheduledStart: "asc" },
        },
      },
    })

    return tripDay
  }

  async updateTripDay(
    tripId: string,
    dayIndex: number,
    data: {
      name?: string
      notes?: string
    },
  ): Promise<TripDay> {
    return prisma.tripDay.update({
      where: {
        tripId_dayIndex: {
          tripId,
          dayIndex,
        },
      },
      data,
    })
  }
}

export default new TripDayService()
