import { PackingListTemplate, TripPackingItem, Prisma } from "@prisma/client"

import prisma from "../utils/prisma"

export class PackingListService {
  // Template methods
  async listTemplates(): Promise<PackingListTemplate[]> {
    return prisma.packingListTemplate.findMany({
      orderBy: { category: "asc" },
    })
  }

  async createTemplate(data: Prisma.PackingListTemplateCreateInput): Promise<PackingListTemplate> {
    return prisma.packingListTemplate.create({ data })
  }

  async deleteTemplate(id: string): Promise<void> {
    await prisma.packingListTemplate.delete({ where: { id } })
  }

  // Trip-specific methods
  async listTripItems(tripId: string): Promise<TripPackingItem[]> {
    return prisma.tripPackingItem.findMany({
      where: { tripId },
      orderBy: [{ category: "asc" }, { priority: "desc" }],
    })
  }

  async createTripItem(data: {
    tripId: string
    item: string
    category?: string
    quantity?: number
    priority?: number
  }): Promise<TripPackingItem> {
    return prisma.tripPackingItem.create({
      data: {
        trip: { connect: { id: data.tripId } },
        item: data.item,
        category: data.category,
        quantity: data.quantity || 1,
        priority: data.priority || 0,
      },
    })
  }

  async updateTripItem(id: string, data: Prisma.TripPackingItemUpdateInput): Promise<TripPackingItem> {
    return prisma.tripPackingItem.update({
      where: { id },
      data,
    })
  }

  async deleteTripItem(id: string): Promise<void> {
    await prisma.tripPackingItem.delete({ where: { id } })
  }

  async addFromTemplates(tripId: string, templateIds: string[]): Promise<void> {
    const templates = await prisma.packingListTemplate.findMany({
      where: { id: { in: templateIds } },
    })

    await prisma.tripPackingItem.createMany({
      data: templates.map((t) => ({
        tripId,
        item: t.item,
        category: t.category,
        priority: t.priority,
        quantity: 1,
      })),
    })
  }
}

export default new PackingListService()
