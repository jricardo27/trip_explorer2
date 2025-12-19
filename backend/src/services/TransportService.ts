import { TransportAlternative, Prisma, TransportMode } from "@prisma/client"

import prisma from "../utils/prisma"

export class TransportService {
  async createTransport(data: {
    tripId: string
    fromActivityId: string
    toActivityId: string
    transportMode: TransportMode
    name?: string
    durationMinutes: number
    cost?: number
    currency?: string
    description?: string
    notes?: string
  }): Promise<TransportAlternative> {
    // Check if we should auto-select this (e.g. if it's the first one)
    const existingCount = await prisma.transportAlternative.count({
      where: {
        fromActivityId: data.fromActivityId,
        toActivityId: data.toActivityId,
      },
    })
    const isSelected = existingCount === 0

    return prisma.transportAlternative.create({
      data: {
        trip: { connect: { id: data.tripId } },
        fromActivity: { connect: { id: data.fromActivityId } },
        toActivity: { connect: { id: data.toActivityId } },
        name: data.name || data.transportMode,
        transportMode: data.transportMode,
        durationMinutes: data.durationMinutes,
        cost: data.cost,
        currency: data.currency || "AUD",
        description: data.description,
        notes: data.notes,
        isSelected,
      },
    })
  }

  async getTransportById(id: string): Promise<TransportAlternative | null> {
    return prisma.transportAlternative.findUnique({
      where: { id },
    })
  }

  async listTransportByTrip(tripId: string): Promise<TransportAlternative[]> {
    return prisma.transportAlternative.findMany({
      where: { tripId },
      orderBy: { createdAt: "asc" },
    })
  }

  // List alternatives for a specific pair
  async listAlternatives(fromActivityId: string, toActivityId: string): Promise<TransportAlternative[]> {
    return prisma.transportAlternative.findMany({
      where: { fromActivityId, toActivityId },
      orderBy: { createdAt: "asc" },
    })
  }

  async updateTransport(id: string, data: Prisma.TransportAlternativeUpdateInput): Promise<TransportAlternative> {
    return prisma.transportAlternative.update({
      where: { id },
      data,
    })
  }

  async deleteTransport(id: string): Promise<void> {
    await prisma.transportAlternative.delete({
      where: { id },
    })
  }

  async selectTransport(id: string): Promise<TransportAlternative> {
    // 1. Get the transport to find its pair
    const transport = await prisma.transportAlternative.findUnique({
      where: { id },
    })

    if (!transport) {
      throw new Error("Transport alternative not found")
    }

    // 2. Transaction: Deselect all others in pair, select this one
    const [, updatedTransport] = await prisma.$transaction([
      prisma.transportAlternative.updateMany({
        where: {
          fromActivityId: transport.fromActivityId,
          toActivityId: transport.toActivityId,
        },
        data: { isSelected: false },
      }),
      prisma.transportAlternative.update({
        where: { id },
        data: { isSelected: true },
      }),
    ])

    return updatedTransport
  }
}

export default new TransportService()
