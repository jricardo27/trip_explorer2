import { Request, Response, NextFunction } from "express"

import tripService from "../services/TripService"
import prisma from "../utils/prisma"

export const checkTripPermission = (requiredRole: "OWNER" | "EDITOR" | "VIEWER") => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      let tripId = req.params?.tripId || req.body?.tripId || req.query?.tripId || (req as any).tripId
      const entityId = req.params?.id

      // If no tripId but we have an entity ID, try to find the associated Trip ID
      if (!tripId && entityId) {
        // 1. Is it a Trip ID?
        const tripCheck = await prisma.trip.findUnique({
          where: { id: entityId },
          select: { id: true },
        })

        if (tripCheck) {
          tripId = entityId
        } else {
          // Try looking up other potential entities
          const [activity, doc, transport, animation, checklist, packing, expense, day] = await Promise.all([
            prisma.activity.findUnique({ where: { id: entityId }, select: { tripId: true } }),
            prisma.tripDocument.findUnique({ where: { id: entityId }, select: { tripId: true } }),
            prisma.transportAlternative.findUnique({ where: { id: entityId }, select: { tripId: true } }),
            prisma.tripAnimation.findUnique({ where: { id: entityId }, select: { tripId: true } }),
            prisma.tripChecklistItem.findUnique({ where: { id: entityId }, select: { tripId: true } }),
            prisma.tripPackingItem.findUnique({ where: { id: entityId }, select: { tripId: true } }),
            prisma.expense.findUnique({ where: { id: entityId }, select: { tripId: true } }),
            prisma.tripDay.findUnique({ where: { id: entityId }, select: { tripId: true } }),
          ])

          tripId =
            activity?.tripId ||
            doc?.tripId ||
            transport?.tripId ||
            animation?.tripId ||
            checklist?.tripId ||
            packing?.tripId ||
            expense?.tripId ||
            day?.tripId
        }
      }

      const userId = (req as any).user?.id
      const userEmail = (req as any).user?.email

      if (!userId) {
        return res.status(401).json({ error: "Authentication required" })
      }

      if (!tripId) {
        return res.status(400).json({ error: "Trip ID is required for permission check" })
      }

      const trip = await tripService.getTripById(tripId as string, userId, userEmail)
      if (!trip) {
        return res.status(404).json({ error: "Trip not found or unauthorized" })
      }

      const isOwner = trip.userId === userId
      const member = (trip as any).members.find((m: any) => m.userId === userId || (userEmail && m.email === userEmail))
      const userRole = isOwner ? "OWNER" : member?.role || "VIEWER"

      const roles = ["VIEWER", "EDITOR", "OWNER"]
      if (roles.indexOf(userRole) < roles.indexOf(requiredRole)) {
        return res.status(403).json({ error: `Unauthorized: ${requiredRole} role required (you have ${userRole})` })
      }

      ;(req as any).trip = trip
      ;(req as any).userRole = userRole
      next()
    } catch (error) {
      next(error)
    }
  }
}
