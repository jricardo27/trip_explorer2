import { Request, Response, NextFunction } from "express"

import activityService from "../services/ActivityService"
import tripService from "../services/TripService"
import { createActivitySchema } from "../utils/validation" // Ensure these exist or create them

class ActivityController {
  async createActivity(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.id
      const activityData = req.body

      // Validate using Zod
      const validatedData = createActivitySchema.parse(activityData)

      // Check trip ownership
      const trip = await tripService.getTripById(validatedData.tripId, userId)
      if (!trip) {
        return res.status(403).json({ error: "Unauthorized or Trip not found" })
      }

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
      const userId = (req as any).user.id

      const activity = await activityService.getActivityById(id)
      if (!activity) {
        return res.status(404).json({ error: "Activity not found" })
      }

      // Check access (trip ownership)
      const trip = await tripService.getTripById(activity.tripId, userId)
      if (!trip) {
        return res.status(403).json({ error: "Unauthorized" })
      }

      res.json(activity)
    } catch (error) {
      next(error)
    }
  }

  async listActivities(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.id
      const { tripId } = req.query as { tripId: string }

      if (!tripId) {
        return res.status(400).json({ error: "tripId is required" })
      }

      const trip = await tripService.getTripById(tripId, userId)
      if (!trip) {
        return res.status(403).json({ error: "Unauthorized" })
      }

      const activities = await activityService.listActivitiesByTrip(tripId, req.query as any)
      res.json(activities)
    } catch (error) {
      next(error)
    }
  }

  async updateActivity(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params
      const userId = (req as any).user.id
      const updateData = req.body

      const activity = await activityService.getActivityById(id)
      if (!activity) {
        return res.status(404).json({ error: "Activity not found" })
      }

      const trip = await tripService.getTripById(activity.tripId, userId)
      if (!trip) {
        return res.status(403).json({ error: "Unauthorized" })
      }

      // Remove immutable fields that shouldn't be in update data
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { id: _, tripId: __, createdAt: ___, participantIds, ...sanitizedData } = updateData

      // Handle participants separately if provided
      const prismaUpdateData: any = sanitizedData

      if (participantIds !== undefined) {
        // Delete existing participants and create new ones
        prismaUpdateData.participants = {
          deleteMany: {},
          create: participantIds.map((memberId: string) => ({ memberId })),
        }
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

      const trip = await tripService.getTripById(activity.tripId, userId)
      if (!trip) {
        return res.status(403).json({ error: "Unauthorized" })
      }

      await activityService.deleteActivity(id, userId)
      res.status(204).send()
    } catch (error) {
      next(error)
    }
  }

  async copyActivity(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.id
      const { id } = req.params

      const copiedActivity = await activityService.copyActivity(id, userId)
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
      const userId = (req as any).user.id
      const { tripId, updates } = req.body

      if (!tripId || !updates || !Array.isArray(updates)) {
        return res.status(400).json({ error: "Invalid request" })
      }

      // Check access
      const trip = await tripService.getTripById(tripId, userId)
      if (!trip) {
        return res.status(403).json({ error: "Unauthorized" })
      }

      await activityService.reorderActivities(tripId, updates)
      res.json({ message: "Activities reordered successfully" })
    } catch (error) {
      next(error)
    }
  }

  async addParticipant(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.id
      const { id } = req.params // activityId
      const { memberId } = req.body

      if (!memberId) {
        return res.status(400).json({ error: "memberId is required" })
      }

      const activity = await activityService.getActivityById(id)
      if (!activity) {
        return res.status(404).json({ error: "Activity not found" })
      }

      const trip = await tripService.getTripById(activity.tripId, userId)
      if (!trip) {
        return res.status(403).json({ error: "Unauthorized" })
      }

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
      const userId = (req as any).user.id
      const { id, memberId } = req.params

      const activity = await activityService.getActivityById(id)
      if (!activity) {
        return res.status(404).json({ error: "Activity not found" })
      }

      const trip = await tripService.getTripById(activity.tripId, userId)
      if (!trip) {
        return res.status(403).json({ error: "Unauthorized" })
      }

      await activityService.removeParticipant(id, memberId)
      res.status(204).send()
    } catch (error) {
      next(error)
    }
  }
}

export default new ActivityController()
