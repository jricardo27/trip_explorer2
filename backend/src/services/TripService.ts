import { Trip, Prisma } from "@prisma/client"
import dayjs from "dayjs"

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
        checklistItems: {
          orderBy: [{ category: "asc" }, { priority: "desc" }],
        },
        packingItems: {
          orderBy: [{ category: "asc" }, { priority: "desc" }],
        },
        animations: {
          include: {
            steps: {
              orderBy: { orderIndex: "asc" },
            },
          },
          orderBy: { createdAt: "desc" },
        },
        documents: {
          orderBy: { createdAt: "asc" },
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
      checklistCategories: string[]
      packingCategories: string[]
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
        days: {
          include: {
            activities: {
              include: {
                participants: true,
              },
            },
          },
        },
        members: true,
        budgets: true,
        checklistItems: true,
        packingItems: true,
      },
    })

    if (!originalTrip) {
      throw new Error("Trip not found")
    }

    const duration = originalTrip.endDate.getTime() - originalTrip.startDate.getTime()
    const newEndDate = new Date(newStartDate.getTime() + duration)
    const shiftMs = newStartDate.getTime() - originalTrip.startDate.getTime()

    // 1. Create the Trip
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
      },
    })

    // Map to keep track of old IDs to new IDs
    const memberMap = new Map<string, string>()

    // 2. Copy Members (as Editors, except the owner)
    for (const member of originalTrip.members) {
      const newMember = await prisma.tripMember.create({
        data: {
          tripId: newTrip.id,
          userId: member.userId,
          name: member.name,
          email: member.email,
          role: member.userId === userId ? "OWNER" : "EDITOR",
          avatarUrl: member.avatarUrl,
          color: member.color,
        },
      })
      memberMap.set(member.id, newMember.id)
    }

    // 3. Copy Days & Activities
    for (const day of originalTrip.days) {
      const newDay = await prisma.tripDay.create({
        data: {
          tripId: newTrip.id,
          dayIndex: day.dayIndex,
          date: new Date(day.date.getTime() + shiftMs),
          name: day.name,
          notes: day.notes,
        },
      })

      for (const activity of day.activities) {
        const newActivity = await prisma.activity.create({
          data: {
            tripId: newTrip.id,
            tripDayId: newDay.id,
            activityType: activity.activityType,
            activitySubtype: activity.activitySubtype,
            name: activity.name,
            description: activity.description,
            notes: activity.notes,
            address: activity.address,
            city: activity.city,
            country: activity.country,
            countryCode: activity.countryCode,
            latitude: activity.latitude,
            longitude: activity.longitude,
            scheduledStart: activity.scheduledStart ? new Date(activity.scheduledStart.getTime() + shiftMs) : null,
            scheduledEnd: activity.scheduledEnd ? new Date(activity.scheduledEnd.getTime() + shiftMs) : null,
            durationMinutes: activity.durationMinutes,
            isAllDay: activity.isAllDay,
            isFlexible: activity.isFlexible,
            status: "PLANNED",
            priority: activity.priority,
            orderIndex: activity.orderIndex,
            estimatedCost: activity.estimatedCost,
            currency: activity.currency,
            availableDays: activity.availableDays,
          },
        })

        // Copy Participants
        for (const p of activity.participants) {
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

    // 4. Copy Budgets
    for (const budget of originalTrip.budgets) {
      await prisma.budget.create({
        data: {
          tripId: newTrip.id,
          category: budget.category,
          amount: budget.amount,
          currency: budget.currency,
          alertThresholdPercentage: budget.alertThresholdPercentage,
          notes: budget.notes,
        },
      })
    }

    // 5. Copy Checklist/Packing Items
    for (const item of originalTrip.checklistItems) {
      await prisma.tripChecklistItem.create({
        data: {
          tripId: newTrip.id,
          task: item.task,
          category: item.category,
          priority: item.priority,
          isDone: false,
        },
      })
    }
    for (const item of originalTrip.packingItems) {
      await prisma.tripPackingItem.create({
        data: {
          tripId: newTrip.id,
          item: item.item,
          category: item.category,
          priority: item.priority,
          quantity: item.quantity,
          isPacked: false,
        },
      })
    }

    return newTrip
  }

  async shiftTripDates(tripId: string, userId: string, daysToShift: number): Promise<Trip> {
    const trip = await prisma.trip.findFirst({
      where: { id: tripId, userId },
      include: {
        days: true,
        activities: true,
        expenses: true,
      },
    })

    if (!trip) throw new Error("Trip not found")

    const shiftMs = daysToShift * 24 * 60 * 60 * 1000

    await prisma.$transaction(async (tx) => {
      // 1. Shift Trip Dates
      await tx.trip.update({
        where: { id: tripId },
        data: {
          startDate: new Date(trip.startDate.getTime() + shiftMs),
          endDate: new Date(trip.endDate.getTime() + shiftMs),
        },
      })

      // 2. Shift Day Dates
      for (const day of trip.days) {
        await tx.tripDay.update({
          where: { id: day.id },
          data: {
            date: new Date(day.date.getTime() + shiftMs),
          },
        })
      }

      // 3. Shift Activity Scheduled Times
      for (const activity of trip.activities) {
        const updates: any = {}
        if (activity.scheduledStart) {
          updates.scheduledStart = new Date(activity.scheduledStart.getTime() + shiftMs)
        }
        if (activity.scheduledEnd) {
          updates.scheduledEnd = new Date(activity.scheduledEnd.getTime() + shiftMs)
        }
        if (activity.bookingDeadline) {
          updates.bookingDeadline = new Date(activity.bookingDeadline.getTime() + shiftMs)
        }

        if (Object.keys(updates).length > 0) {
          await tx.activity.update({
            where: { id: activity.id },
            data: updates,
          })
        }
      }

      // 4. Shift Expenses
      for (const expense of trip.expenses) {
        if (expense.paymentDate) {
          await tx.expense.update({
            where: { id: expense.id },
            data: {
              paymentDate: new Date(expense.paymentDate.getTime() + shiftMs),
            },
          })
        }
      }
    })

    return (await this.getTripById(tripId, userId)) as Trip
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
        checklistItems: true,
        packingItems: true,
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
        checklistItems: true,
        packingItems: true,
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

  async moveActivities(tripId: string, fromDayId: string, toDayId: string): Promise<void> {
    const fromDay = await prisma.tripDay.findUnique({ where: { id: fromDayId, tripId } })
    const toDay = await prisma.tripDay.findUnique({ where: { id: toDayId, tripId } })
    if (!fromDay || !toDay) throw new Error("Days not found or do not belong to trip")

    const activities = await prisma.activity.findMany({ where: { tripDayId: fromDayId } })
    const dayDiff = dayjs(toDay.date).diff(dayjs(fromDay.date), "day")

    await prisma.$transaction(
      activities.map((activity) => {
        let newStart = activity.scheduledStart
        let newEnd = activity.scheduledEnd

        if (newStart) newStart = dayjs(newStart).add(dayDiff, "day").toDate()
        if (newEnd) newEnd = dayjs(newEnd).add(dayDiff, "day").toDate()

        return prisma.activity.update({
          where: { id: activity.id },
          data: {
            tripDayId: toDayId,
            scheduledStart: newStart,
            scheduledEnd: newEnd,
          },
        })
      }),
    )
  }

  async swapDays(tripId: string, dayId1: string, dayId2: string): Promise<void> {
    const day1 = await prisma.tripDay.findUnique({ where: { id: dayId1, tripId }, include: { activities: true } })
    const day2 = await prisma.tripDay.findUnique({ where: { id: dayId2, tripId }, include: { activities: true } })
    if (!day1 || !day2) throw new Error("Days not found")

    const diff1To2 = dayjs(day2.date).diff(dayjs(day1.date), "day")
    const diff2To1 = dayjs(day1.date).diff(dayjs(day2.date), "day")

    await prisma.$transaction([
      ...day1.activities.map((a) => {
        const newStart = a.scheduledStart ? dayjs(a.scheduledStart).add(diff1To2, "day").toDate() : null
        const newEnd = a.scheduledEnd ? dayjs(a.scheduledEnd).add(diff1To2, "day").toDate() : null
        return prisma.activity.update({
          where: { id: a.id },
          data: { tripDayId: day2.id, scheduledStart: newStart, scheduledEnd: newEnd },
        })
      }),

      ...day2.activities.map((a) => {
        const newStart = a.scheduledStart ? dayjs(a.scheduledStart).add(diff2To1, "day").toDate() : null
        const newEnd = a.scheduledEnd ? dayjs(a.scheduledEnd).add(diff2To1, "day").toDate() : null
        return prisma.activity.update({
          where: { id: a.id },
          data: { tripDayId: day1.id, scheduledStart: newStart, scheduledEnd: newEnd },
        })
      }),
    ])
  }

  async moveDay(tripId: string, dayId: string, newDate: Date): Promise<void> {
    const day = await prisma.tripDay.findUnique({ where: { id: dayId, tripId }, include: { activities: true } })
    if (!day) throw new Error("Day not found")

    const dateDiff = dayjs(newDate).diff(dayjs(day.date), "day")

    await prisma.$transaction([
      prisma.tripDay.update({ where: { id: dayId }, data: { date: newDate } }),
      ...day.activities.map((a) => {
        const newStart = a.scheduledStart ? dayjs(a.scheduledStart).add(dateDiff, "day").toDate() : null
        const newEnd = a.scheduledEnd ? dayjs(a.scheduledEnd).add(dateDiff, "day").toDate() : null
        return prisma.activity.update({
          where: { id: a.id },
          data: { scheduledStart: newStart, scheduledEnd: newEnd },
        })
      }),
    ])
  }
}

export default new TripService()
