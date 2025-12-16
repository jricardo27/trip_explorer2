import prisma from "../utils/prisma"

export class ExpenseService {
  async getExpensesByTrip(tripId: string) {
    return prisma.expense.findMany({
      where: { tripId },
      include: {
        paidBy: true,
        splits: {
          include: {
            member: true,
          },
        },
        activity: true,
      },
      orderBy: { createdAt: "desc" },
    })
  }

  async createExpense(data: {
    tripId: string
    activityId?: string
    description: string
    category: string
    amount: number
    currency: string
    paidById?: string
    date?: string
    isPaid?: boolean
    splitType?: string
    splits?: { memberId: string; amount?: number }[]
  }) {
    // If splitType is equal, we handle splits logic here or frontend?
    // User requested "Expense Tracking" first, "Splitting" next.
    // For now, simple creation.

    return prisma.expense.create({
      data: {
        tripId: data.tripId,
        activityId: data.activityId,
        description: data.description,
        category: data.category,
        amount: data.amount,
        currency: data.currency,
        paidById: data.paidById,
        paymentDate: data.date ? new Date(data.date) : new Date(),
        isPaid: data.isPaid ?? true,
        splitType: data.splitType || "equal",
        // Create splits if provided
        splits: data.splits
          ? {
              create: data.splits.map((s) => ({
                memberId: s.memberId,
                amount: s.amount || 0, // If equal, need calculation. assuming validation handles amounts or we trust frontend.
              })),
            }
          : undefined,
      },
      include: {
        paidBy: true,
        splits: { include: { member: true } },
      },
    })
  }

  async updateExpense(
    id: string,
    data: {
      description?: string
      category?: string
      amount?: number
      currency?: string
      paidById?: string
      date?: string
      isPaid?: boolean
      deleteSplits?: boolean
      splits?: { memberId: string; amount?: number }[]
    },
  ) {
    return prisma.expense.update({
      where: { id },
      data: {
        description: data.description,
        category: data.category,
        amount: data.amount,
        currency: data.currency,
        paidById: data.paidById,
        paymentDate: data.date ? new Date(data.date) : undefined,
        isPaid: data.isPaid,
        // If updating splits, we typically delete old ones and recreate
        splits: data.splits
          ? {
              deleteMany: {},
              create: data.splits.map((s) => ({
                memberId: s.memberId,
                amount: s.amount || 0,
              })),
            }
          : undefined,
      },
      include: {
        paidBy: true,
        splits: { include: { member: true } },
      },
    })
  }

  async deleteExpense(id: string) {
    return prisma.expense.delete({
      where: { id },
    })
  }
}

export const expenseService = new ExpenseService()
