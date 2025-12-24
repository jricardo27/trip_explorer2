import { Request, Response, NextFunction } from "express"

import activityService from "../services/ActivityService"
import { createActivitySchema, updateActivitySchema } from "../utils/validation" // Ensure these exist or create them

class ActivityController {
  async createActivity(req: Request, res: Response, next: NextFunction) {
    try {
      const activityData = req.body

      // Validate using Zod
      const validatedData = createActivitySchema.parse(activityData)

      // Permission already checked by middleware (checkTripPermission("EDITOR"))
      // req.trip and req.userRole are available if needed.

      // Transform date strings to Date objects for service
      const serviceData = {
        ...validatedData,
        scheduledStart: validatedData.scheduledStart ? new Date(validatedData.scheduledStart) : undefined,
        scheduledEnd: validatedData.scheduledEnd ? new Date(validatedData.scheduledEnd) : undefined,
      }

      const activity = await activityService.createActivity(serviceData)
      res.status(201).json(activity)
    } catch (error) {
      next(error)
    }
  }

  async getActivity(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params

      const activity = await activityService.getActivityById(id)
      if (!activity) {
        return res.status(404).json({ error: "Activity not found" })
      }

      // Permission already checked by middleware (checkTripPermission("VIEWER"))

      res.json(activity)
    } catch (error) {
      next(error)
    }
  }

  async listActivities(req: Request, res: Response, next: NextFunction) {
    try {
      const { tripId } = req.query as { tripId: string }

      if (!tripId) {
        return res.status(400).json({ error: "tripId is required" })
      }

      // Permission already checked by middleware (checkTripPermission("VIEWER"))

      const activities = await activityService.listActivitiesByTrip(tripId, req.query as any)
      res.json(activities)
    } catch (error) {
      next(error)
    }
  }

  async updateActivity(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params
      const activityData = req.body

      const activity = await activityService.getActivityById(id)
      if (!activity) {
        return res.status(404).json({ error: "Activity not found" })
      }

      // Permission already checked by middleware (checkTripPermission("EDITOR"))
      // Validate using Zod
      const validatedData = updateActivitySchema.parse(activityData)

      // Transform dates and relations for Prisma
      const prismaUpdateData: any = {
        ...validatedData,
      }

      if (validatedData.scheduledStart) prismaUpdateData.scheduledStart = new Date(validatedData.scheduledStart)
      if (validatedData.scheduledEnd) prismaUpdateData.scheduledEnd = new Date(validatedData.scheduledEnd)
      if (validatedData.actualStart) prismaUpdateData.actualStart = new Date(validatedData.actualStart)
      if (validatedData.actualEnd) prismaUpdateData.actualEnd = new Date(validatedData.actualEnd)

      if (validatedData.tripDayId) {
        prismaUpdateData.tripDay = {
          connect: { id: validatedData.tripDayId },
        }
        delete prismaUpdateData.tripDayId
      }

      if (validatedData.participantIds !== undefined) {
        prismaUpdateData.participants = {
          deleteMany: {},
          create: validatedData.participantIds.map((memberId: string) => ({ memberId })),
        }
        delete prismaUpdateData.participantIds
      }

      const updatedActivity = await activityService.updateActivity(id, prismaUpdateData)
      res.json(updatedActivity)
    } catch (error) {
      next(error)
    }
  }

  async deleteActivity(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params
      const userId = (req as any).user.id

      const activity = await activityService.getActivityById(id)
      if (!activity) {
        return res.status(404).json({ error: "Activity not found" })
      }

      // Permission checked by middleware (EDITOR)
      await activityService.deleteActivity(id, userId)
      res.status(204).send()
    } catch (error) {
      next(error)
    }
  }

  async copyActivity(req: Request, res: Response, next: NextFunction) {
    try {
      // const userId = (req as any).user.id // Unused in copyActivity now
      const { id } = req.params

      const { targetDayId, asLink } = req.body

      const copiedActivity = await activityService.copyActivity(id, targetDayId, asLink)
      res.status(201).json(copiedActivity)
    } catch (error: any) {
      if (error.message === "Activity not found or unauthorized") {
        return res.status(404).json({ error: error.message })
      }
      next(error)
    }
  }

  async reorder(req: Request, res: Response, next: NextFunction) {
    try {
      const { tripId, updates } = req.body

      if (!tripId || !updates || !Array.isArray(updates)) {
        return res.status(400).json({ error: "Invalid request" })
      }

      // Permission checked by middleware (EDITOR)
      await activityService.reorderActivities(tripId, updates)
      res.json({ message: "Activities reordered successfully" })
    } catch (error) {
      next(error)
    }
  }

  async addParticipant(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params // activityId
      const { memberId } = req.body

      if (!memberId) {
        return res.status(400).json({ error: "memberId is required" })
      }

      const activity = await activityService.getActivityById(id)
      if (!activity) {
        return res.status(404).json({ error: "Activity not found" })
      }

      // Permission checked by middleware (EDITOR)
      const participant = await activityService.addParticipant(id, memberId)
      res.status(201).json(participant)
    } catch (error: any) {
      if (error.code === "P2002") {
        return res.status(409).json({ error: "Member is already a participant" })
      }
      next(error)
    }
  }

  async removeParticipant(req: Request, res: Response, next: NextFunction) {
    try {
      const { id, memberId } = req.params

      const activity = await activityService.getActivityById(id)
      if (!activity) {
        return res.status(404).json({ error: "Activity not found" })
      }

      // Permission checked by middleware (EDITOR)
      await activityService.removeParticipant(id, memberId)
      res.status(204).send()
    } catch (error) {
      next(error)
    }
  }
}

export default new ActivityController()
