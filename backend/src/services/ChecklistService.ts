import { ChecklistTemplate, TripChecklistItem, Prisma } from "@prisma/client"

import prisma from "../utils/prisma"

export class ChecklistService {
  // Template methods
  async listTemplates(): Promise<ChecklistTemplate[]> {
    return prisma.checklistTemplate.findMany({
      orderBy: { category: "asc" },
    })
  }

  async createTemplate(data: Prisma.ChecklistTemplateCreateInput): Promise<ChecklistTemplate> {
    return prisma.checklistTemplate.create({ data })
  }

  async deleteTemplate(id: string): Promise<void> {
    await prisma.checklistTemplate.delete({ where: { id } })
  }

  // Trip-specific methods
  async listTripItems(tripId: string): Promise<TripChecklistItem[]> {
    return prisma.tripChecklistItem.findMany({
      where: { tripId },
      orderBy: [{ category: "asc" }, { priority: "desc" }],
    })
  }

  async createTripItem(data: {
    tripId: string
    task: string
    category?: string
    priority?: number
  }): Promise<TripChecklistItem> {
    return prisma.tripChecklistItem.create({
      data: {
        trip: { connect: { id: data.tripId } },
        task: data.task,
        category: data.category,
        priority: data.priority || 0,
      },
    })
  }

  async updateTripItem(id: string, data: Prisma.TripChecklistItemUpdateInput): Promise<TripChecklistItem> {
    return prisma.tripChecklistItem.update({
      where: { id },
      data,
    })
  }

  async deleteTripItem(id: string): Promise<void> {
    await prisma.tripChecklistItem.delete({ where: { id } })
  }

  async addFromTemplates(tripId: string, templateIds: string[]): Promise<void> {
    const templates = await prisma.checklistTemplate.findMany({
      where: { id: { in: templateIds } },
    })

    await prisma.tripChecklistItem.createMany({
      data: templates.map((t) => ({
        tripId,
        task: t.task,
        category: t.category,
        priority: t.priority,
      })),
    })
  }
}

export default new ChecklistService()
