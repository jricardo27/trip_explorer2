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
    currencies?: string[]
    exchangeRates?: Record<string, number>
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
        currencies: data.currencies || ["AUD"],
        exchangeRates: data.exchangeRates || {},
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
              include: {
                participants: {
                  include: {
                    member: true,
                  },
                },
              },
            },
          },
        },
        activities: {
          orderBy: [{ orderIndex: "asc" }, { scheduledStart: "asc" }],
          include: {
            participants: {
              include: {
                member: true,
              },
            },
          },
        },
        members: true,
        budgets: true,
        transport: true,
        animations: {
          include: {
            steps: {
              orderBy: { orderIndex: "asc" },
            },
          },
          orderBy: { createdAt: "desc" },
        },
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
      currencies: string[]
      exchangeRates: Record<string, number>
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

  async updateDay(
    tripId: string,
    dayId: string,
    userId: string,
    data: Partial<{
      name: string
      notes: string
    }>,
  ): Promise<any> {
    // Verify trip belongs to user
    const trip = await prisma.trip.findFirst({
      where: { id: tripId, userId },
    })

    if (!trip) {
      throw new Error("Trip not found")
    }

    // Update the day
    const day = await prisma.tripDay.update({
      where: {
        id: dayId,
      },
      data,
    })

    return day
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
        currencies: originalTrip.currencies,
        exchangeRates: originalTrip.exchangeRates || {},
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

  async exportTrip(id: string, userId: string): Promise<any> {
    const trip = await prisma.trip.findFirst({
      where: { id, userId },
      include: {
        days: {
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
        },
        activities: {
          include: { participants: true },
        },
        members: true,
        budgets: true,
        transport: true,
        expenses: {
          include: {
            splits: true,
          },
        },
        animations: {
          include: {
            steps: true,
          },
        },
      },
    })

    if (!trip) throw new Error("Trip not found")
    return trip
  }

  async exportAllTrips(userId: string): Promise<any[]> {
    const trips = await prisma.trip.findMany({
      where: { userId },
      include: {
        days: {
          include: {
            activities: {
              include: {
                participants: {
                  include: { member: true },
                },
              },
            },
          },
        },
        activities: {
          include: { participants: true },
        },
        members: true,
        budgets: true,
        transport: true,
        expenses: {
          include: {
            splits: true,
          },
        },
        animations: {
          include: {
            steps: true,
          },
        },
      },
    })
    return trips
  }

  async importTrip(data: any, userId: string): Promise<Trip> {
    const trip = await prisma.trip.create({
      data: {
        userId,
        name: `${data.name} (Imported)`,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        budget: data.budget,
        defaultCurrency: data.defaultCurrency,
        currencies: data.currencies,
        exchangeRates: data.exchangeRates || {},
        timezone: data.timezone,
        isCompleted: data.isCompleted,
        isPublic: false,
      },
    })

    const dayMap = new Map<string, string>()
    const memberMap = new Map<string, string>()
    const activityMap = new Map<string, string>()

    if (data.members) {
      for (const m of data.members) {
        const newMember = await prisma.tripMember.create({
          data: {
            tripId: trip.id,
            name: m.name,
            email: m.email,
            role: m.role,
            color: m.color,
            avatarUrl: m.avatarUrl,
            userId: m.userId === userId ? userId : undefined,
          },
        })
        memberMap.set(m.id, newMember.id)
      }
    }

    // Sort days by dayIndex to safely map
    if (data.days) {
      for (const d of data.days) {
        const newDay = await prisma.tripDay.create({
          data: {
            tripId: trip.id,
            dayIndex: d.dayIndex,
            date: new Date(d.date),
            name: d.name,
            notes: d.notes,
          },
        })
        dayMap.set(d.id, newDay.id)
      }
    }

    if (data.activities) {
      for (const a of data.activities) {
        const newDayId = a.tripDayId ? dayMap.get(a.tripDayId) : undefined

        const newActivity = await prisma.activity.create({
          data: {
            tripId: trip.id,
            tripDayId: newDayId,
            activityType: a.activityType,
            name: a.name,
            description: a.description ? a.description : undefined,
            notes: a.notes,
            scheduledStart: a.scheduledStart ? new Date(a.scheduledStart) : undefined,
            scheduledEnd: a.scheduledEnd ? new Date(a.scheduledEnd) : undefined,
            durationMinutes: a.durationMinutes,
            latitude: a.latitude,
            longitude: a.longitude,
            city: a.city,
            country: a.country,
            countryCode: a.countryCode,
            estimatedCost: a.estimatedCost,
            currency: a.currency,
            status: a.status,
            isPaid: a.isPaid,
            useDefaultMembers: a.useDefaultMembers,
            isGroupActivity: a.isGroupActivity,
            orderIndex: a.orderIndex,
          },
        })
        activityMap.set(a.id, newActivity.id)

        if (a.participants) {
          for (const p of a.participants) {
            const newMemberId = memberMap.get(p.memberId)
            if (newMemberId) {
              await prisma.activityParticipant.create({
                data: {
                  activityId: newActivity.id,
                  memberId: newMemberId,
                },
              })
            }
          }
        }
      }
    }

    if (data.transport) {
      for (const t of data.transport) {
        const newFromId = activityMap.get(t.fromActivityId)
        const newToId = activityMap.get(t.toActivityId)
        if (newFromId && newToId) {
          await prisma.transportAlternative.create({
            data: {
              tripId: trip.id,
              fromActivityId: newFromId,
              toActivityId: newToId,
              transportMode: t.transportMode,
              name: t.name,
              durationMinutes: t.durationMinutes,
              cost: t.cost,
              currency: t.currency,
              description: t.description,
              isSelected: t.isSelected,
              bufferMinutes: t.bufferMinutes,
              costPerPerson: t.costPerPerson,
              requiresBooking: t.requiresBooking,
            },
          })
        }
      }
    }

    if (data.budgets) {
      for (const b of data.budgets) {
        await prisma.budget.create({
          data: {
            tripId: trip.id,
            category: b.category,
            amount: b.amount,
            currency: b.currency,
            spentAmount: b.spentAmount,
            alertThresholdPercentage: b.alertThresholdPercentage,
            notes: b.notes,
          },
        })
      }
    }

    if (data.expenses) {
      for (const e of data.expenses) {
        const newActivityId = e.activityId ? activityMap.get(e.activityId) : undefined
        const newPayerId = e.paidById ? memberMap.get(e.paidById) : undefined

        const newExpense = await prisma.expense.create({
          data: {
            tripId: trip.id,
            activityId: newActivityId,
            description: e.description,
            category: e.category,
            amount: e.amount,
            currency: e.currency,
            paidById: newPayerId,
            paymentDate: e.paymentDate ? new Date(e.paymentDate) : undefined,
            isPaid: e.isPaid,
            splitType: e.splitType,
            notes: e.notes,
          },
        })

        if (e.splits) {
          for (const s of e.splits) {
            const newSplitMemberId = memberMap.get(s.memberId)
            if (newSplitMemberId) {
              await prisma.expenseSplit.create({
                data: {
                  expenseId: newExpense.id,
                  memberId: newSplitMemberId,
                  amount: s.amount,
                  percentage: s.percentage,
                  isPaid: s.isPaid,
                },
              })
            }
          }
        }
      }
    }

    if (data.animations) {
      for (const anim of data.animations) {
        // Need to cast JSON because Prisma types can be finicky with JSON input
        const newAnim = await prisma.tripAnimation.create({
          data: {
            tripId: trip.id,
            name: anim.name,
            description: anim.description,
            settings: anim.settings as any,
          },
        })

        if (anim.steps) {
          for (const s of anim.steps) {
            const newStepActivityId = s.activityId ? activityMap.get(s.activityId) : undefined
            await prisma.tripAnimationStep.create({
              data: {
                animationId: newAnim.id,
                activityId: newStepActivityId,
                orderIndex: s.orderIndex,
                isVisible: s.isVisible,
                customLabel: s.customLabel,
                zoomLevel: s.zoomLevel,
                transportMode: s.transportMode,
                settings: s.settings as any,
              },
            })
          }
        }
      }
    }

    return trip
  }
}

export default new TripService()
