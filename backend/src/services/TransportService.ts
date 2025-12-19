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
    splits?: { memberId: string; amount: number; percentage?: number }[]
  }): Promise<TransportAlternative> {
    // Check if we should auto-select this (e.g. if it's the first one)
    const existingCount = await prisma.transportAlternative.count({
      where: {
        fromActivityId: data.fromActivityId,
        toActivityId: data.toActivityId,
      },
    })
    const isSelected = existingCount === 0

    const transport = await prisma.transportAlternative.create({
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

    // Create Expense if cost provided
    if (data.cost && data.cost > 0) {
      await this.syncExpense(transport, data.splits)
    }

    return transport
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

  async updateTransport(
    id: string,
    data: Prisma.TransportAlternativeUpdateInput & {
      splits?: { memberId: string; amount: number; percentage?: number }[]
    },
  ): Promise<TransportAlternative> {
    const { splits, ...updateData } = data
    const transport = await prisma.transportAlternative.update({
      where: { id },
      data: updateData,
    })

    // Sync expense if cost changed or splits provided
    if (updateData.cost !== undefined || splits !== undefined) {
      await this.syncExpense(transport, splits)
    }

    return transport
  }

  async deleteTransport(id: string): Promise<void> {
    // Expense cascade delete should handle the expense if we set up relation correctly?
    // Looking at schema: Expense has optional transportAlternativeId but NO relation defined?
    // Actually Expense has: transportAlternativeId String? @map("transport_alternative_id")
    // But no @relation field back to TransportAlternative?
    // Schema check (Step 2043/2053):
    // Expense: transportAlternativeId String?
    // TransportAlternative: Has no relation to Expense.
    // So we must manually delete the expense.

    await prisma.expense.deleteMany({
      where: { transportAlternativeId: id },
    })

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

  private async syncExpense(
    transport: TransportAlternative,
    splits?: { memberId: string; amount: number; percentage?: number }[],
  ) {
    const cost = transport.cost ? Number(transport.cost) : 0

    if (cost <= 0) {
      // Delete existing expense if cost is removed/zero
      await prisma.expense.deleteMany({
        where: { transportAlternativeId: transport.id },
      })
      return
    }

    // Find existing expense
    const existingExpense = await prisma.expense.findFirst({
      where: { transportAlternativeId: transport.id },
    })

    if (existingExpense) {
      await prisma.expense.update({
        where: { id: existingExpense.id },
        data: {
          amount: cost,
          currency: transport.currency || "AUD",
          description: transport.name || transport.transportMode,
        },
      })
      if (splits) {
        await this.updateSplits(existingExpense.id, splits)
      }
    } else {
      const expense = await prisma.expense.create({
        data: {
          tripId: transport.tripId,
          transportAlternativeId: transport.id,
          amount: cost,
          currency: transport.currency || "AUD",
          description: transport.name || transport.transportMode,
          category: "Transport",
          paymentDate: new Date(), // Use creation date as default
          paidById: undefined,
        },
      })
      if (splits) {
        await this.updateSplits(expense.id, splits)
      }
    }
  }

  private async updateSplits(expenseId: string, splits: { memberId: string; amount: number; percentage?: number }[]) {
    // Clear existing splits
    await prisma.expenseSplit.deleteMany({
      where: { expenseId },
    })

    // Create new splits
    if (splits.length > 0) {
      await prisma.expenseSplit.createMany({
        data: splits.map((s) => ({
          expenseId,
          memberId: s.memberId,
          amount: s.amount,
          percentage: s.percentage,
        })),
      })
    }
  }
}

export default new TransportService()
