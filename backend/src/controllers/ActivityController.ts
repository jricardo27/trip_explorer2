import { Request, Response, NextFunction } from "express"
import activityService from "../services/ActivityService"
import tripService from "../services/TripService"
import { createActivitySchema, updateActivitySchema } from "../utils/validation" // Ensure these exist or create them
import { z } from "zod"

class ActivityController {
  async createActivity(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.id
      const activityData = req.body

      // Validate using Zod (assuming schema exists, or do basic check)
      // const validatedData = createActivitySchema.parse(activityData)

      // Check trip ownership
      const trip = await tripService.getTripById(activityData.tripId, userId)
      if (!trip) {
        return res.status(403).json({ error: "Unauthorized or Trip not found" })
      }

      const activity = await activityService.createActivity(activityData)
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

      const updatedActivity = await activityService.updateActivity(id, updateData)
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

      await activityService.deleteActivity(id)
      res.status(204).send()
    } catch (error) {
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
}

export default new ActivityController()
