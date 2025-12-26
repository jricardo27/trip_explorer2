import { DayScenario } from "@prisma/client"

import prisma from "../utils/prisma"

export class DayScenarioService {
  async createScenario(data: { tripDayId: string; name: string; description?: string }): Promise<DayScenario> {
    // Get the next order index
    const lastScenario = await prisma.dayScenario.findFirst({
      where: { tripDayId: data.tripDayId },
      orderBy: { orderIndex: "desc" },
    })
    const orderIndex = lastScenario ? lastScenario.orderIndex + 1 : 0

    const scenario = await prisma.dayScenario.create({
      data: {
        tripDayId: data.tripDayId,
        name: data.name,
        description: data.description,
        orderIndex,
        isSelected: false, // New scenarios are not selected by default
      },
      include: {
        activities: true,
      },
    })

    return scenario
  }

  async getScenariosByDay(tripDayId: string): Promise<DayScenario[]> {
    return prisma.dayScenario.findMany({
      where: { tripDayId },
      orderBy: { orderIndex: "asc" },
      include: {
        activities: {
          include: {
            participants: {
              include: {
                member: true,
              },
            },
          },
        },
      },
    })
  }

  async duplicateScenario(scenarioId: string, newName?: string): Promise<DayScenario> {
    const source = await prisma.dayScenario.findUnique({
      where: { id: scenarioId },
      include: {
        activities: {
          include: {
            participants: true,
          },
        },
      },
    })

    if (!source) throw new Error("Scenario not found")

    // Get next order index
    const lastScenario = await prisma.dayScenario.findFirst({
      where: { tripDayId: source.tripDayId },
      orderBy: { orderIndex: "desc" },
    })
    const orderIndex = lastScenario ? lastScenario.orderIndex + 1 : 0

    // Create new scenario
    const newScenario = await prisma.dayScenario.create({
      data: {
        tripDayId: source.tripDayId,
        name: newName || `${source.name} (Copy)`,
        description: source.description,
        orderIndex,
        isSelected: false,
      },
    })

    // Duplicate all activities
    for (const activity of source.activities) {
      await prisma.activity.create({
        data: {
          tripId: activity.tripId,
          tripDayId: activity.tripDayId,
          scenarioId: newScenario.id,
          activityType: activity.activityType,
          activitySubtype: activity.activitySubtype,
          category: activity.category,
          name: activity.name,
          description: activity.description,
          notes: activity.notes,
          scheduledStart: activity.scheduledStart,
          scheduledEnd: activity.scheduledEnd,
          durationMinutes: activity.durationMinutes,
          latitude: activity.latitude,
          longitude: activity.longitude,
          address: activity.address,
          city: activity.city,
          country: activity.country,
          countryCode: activity.countryCode,
          estimatedCost: activity.estimatedCost,
          actualCost: activity.actualCost,
          currency: activity.currency,
          isPaid: activity.isPaid,
          isLocked: activity.isLocked,
          orderIndex: activity.orderIndex,
          phone: activity.phone,
          email: activity.email,
          website: activity.website,
          availableDays: activity.availableDays,
          participants: {
            create: activity.participants.map((p) => ({ memberId: p.memberId })),
          },
        },
      })
    }

    return prisma.dayScenario.findUniqueOrThrow({
      where: { id: newScenario.id },
      include: {
        activities: {
          include: {
            participants: {
              include: {
                member: true,
              },
            },
          },
        },
      },
    })
  }

  async selectScenario(scenarioId: string): Promise<DayScenario> {
    const scenario = await prisma.dayScenario.findUnique({
      where: { id: scenarioId },
    })

    if (!scenario) throw new Error("Scenario not found")

    // Deselect all other scenarios for this day
    await prisma.dayScenario.updateMany({
      where: {
        tripDayId: scenario.tripDayId,
        id: { not: scenarioId },
      },
      data: { isSelected: false },
    })

    // Select this scenario
    return prisma.dayScenario.update({
      where: { id: scenarioId },
      data: { isSelected: true },
      include: {
        activities: true,
      },
    })
  }

  async deselectAllScenarios(tripDayId: string): Promise<void> {
    await prisma.dayScenario.updateMany({
      where: { tripDayId },
      data: { isSelected: false },
    })
  }

  async updateScenario(
    scenarioId: string,
    data: {
      name?: string
      description?: string
    },
  ): Promise<DayScenario> {
    return prisma.dayScenario.update({
      where: { id: scenarioId },
      data,
      include: {
        activities: true,
      },
    })
  }

  async deleteScenario(scenarioId: string): Promise<void> {
    const scenario = await prisma.dayScenario.findUnique({
      where: { id: scenarioId },
    })

    if (!scenario) throw new Error("Scenario not found")

    // Don't allow deleting the last scenario
    const scenarioCount = await prisma.dayScenario.count({
      where: { tripDayId: scenario.tripDayId },
    })

    if (scenarioCount <= 1) {
      throw new Error("Cannot delete the last scenario for a day")
    }

    // If deleting the selected scenario, select the first remaining one
    if (scenario.isSelected) {
      const firstRemaining = await prisma.dayScenario.findFirst({
        where: {
          tripDayId: scenario.tripDayId,
          id: { not: scenarioId },
        },
        orderBy: { orderIndex: "asc" },
      })

      if (firstRemaining) {
        await prisma.dayScenario.update({
          where: { id: firstRemaining.id },
          data: { isSelected: true },
        })
      }
    }

    await prisma.dayScenario.delete({
      where: { id: scenarioId },
    })
  }

  async reorderScenarios(tripDayId: string, updates: { scenarioId: string; orderIndex: number }[]): Promise<void> {
    await prisma.$transaction(
      updates.map((update) =>
        prisma.dayScenario.update({
          where: { id: update.scenarioId, tripDayId }, // Ensure tripDayId matches for security
          data: { orderIndex: update.orderIndex },
        }),
      ),
    )
  }
}

export default new DayScenarioService()
