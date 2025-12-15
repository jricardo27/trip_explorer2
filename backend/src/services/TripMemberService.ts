import prisma from "../utils/prisma"
import type { MemberRole } from "@prisma/client"

interface CreateMemberData {
  name: string
  email?: string
  role?: MemberRole
  color?: string
  avatarUrl?: string
}

interface UpdateMemberData {
  name?: string
  email?: string
  role?: MemberRole
  color?: string
  avatarUrl?: string
}

class TripMemberService {
  async getMembers(tripId: string, userId: string) {
    // Verify user has access to trip
    const trip = await prisma.trip.findFirst({
      where: {
        id: tripId,
        userId,
      },
    })

    if (!trip) {
      throw new Error("Trip not found or access denied")
    }

    return prisma.tripMember.findMany({
      where: { tripId },
      orderBy: { createdAt: "asc" },
    })
  }

  async addMember(tripId: string, userId: string, data: CreateMemberData) {
    // Verify user owns the trip
    const trip = await prisma.trip.findFirst({
      where: {
        id: tripId,
        userId,
      },
    })

    if (!trip) {
      throw new Error("Trip not found or access denied")
    }

    // Check if member with same email already exists
    if (data.email) {
      const existing = await prisma.tripMember.findFirst({
        where: {
          tripId,
          email: data.email,
        },
      })

      if (existing) {
        throw new Error("Member with this email already exists")
      }
    }

    return prisma.tripMember.create({
      data: {
        tripId,
        name: data.name,
        email: data.email,
        role: data.role || "VIEWER",
        color: data.color,
        avatarUrl: data.avatarUrl,
      },
    })
  }

  async updateMember(memberId: string, userId: string, data: UpdateMemberData) {
    // Get member and verify ownership
    const member = await prisma.tripMember.findUnique({
      where: { id: memberId },
      include: {
        trip: true,
      },
    })

    if (!member || member.trip.userId !== userId) {
      throw new Error("Member not found or access denied")
    }

    return prisma.tripMember.update({
      where: { id: memberId },
      data: {
        name: data.name,
        email: data.email,
        role: data.role,
        color: data.color,
        avatarUrl: data.avatarUrl,
      },
    })
  }

  async removeMember(memberId: string, userId: string) {
    // Get member and verify ownership
    const member = await prisma.tripMember.findUnique({
      where: { id: memberId },
      include: {
        trip: true,
      },
    })

    if (!member || member.trip.userId !== userId) {
      throw new Error("Member not found or access denied")
    }

    await prisma.tripMember.delete({
      where: { id: memberId },
    })

    return { success: true }
  }
}

export default new TripMemberService()
