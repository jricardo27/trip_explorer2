import { Request, Response } from "express"

import ChecklistService from "../services/ChecklistService"

export class ChecklistController {
  async listTemplates(req: Request, res: Response) {
    try {
      const templates = await ChecklistService.listTemplates()
      res.json(templates)
    } catch (error: any) {
      res.status(500).json({ error: error.message })
    }
  }

  async createTemplate(req: Request, res: Response) {
    try {
      const template = await ChecklistService.createTemplate(req.body)
      res.status(201).json(template)
    } catch (error: any) {
      res.status(500).json({ error: error.message })
    }
  }

  async deleteTemplate(req: Request, res: Response) {
    try {
      const { id } = req.params
      await ChecklistService.deleteTemplate(id)
      res.status(204).send()
    } catch (error: any) {
      res.status(500).json({ error: error.message })
    }
  }

  async listTripItems(req: Request, res: Response) {
    try {
      const { tripId } = req.params
      const items = await ChecklistService.listTripItems(tripId)
      res.json(items)
    } catch (error: any) {
      res.status(500).json({ error: error.message })
    }
  }

  async createTripItem(req: Request, res: Response) {
    try {
      const { tripId } = req.params
      const item = await ChecklistService.createTripItem({ ...req.body, tripId })
      res.status(201).json(item)
    } catch (error: any) {
      res.status(500).json({ error: error.message })
    }
  }

  async updateTripItem(req: Request, res: Response) {
    try {
      const { id } = req.params
      const item = await ChecklistService.updateTripItem(id, req.body)
      res.json(item)
    } catch (error: any) {
      res.status(500).json({ error: error.message })
    }
  }

  async deleteTripItem(req: Request, res: Response) {
    try {
      const { id } = req.params
      await ChecklistService.deleteTripItem(id)
      res.status(204).send()
    } catch (error: any) {
      res.status(500).json({ error: error.message })
    }
  }

  async addFromTemplates(req: Request, res: Response) {
    try {
      const { tripId } = req.params
      const { templateIds } = req.body
      await ChecklistService.addFromTemplates(tripId, templateIds)
      res.status(201).send()
    } catch (error: any) {
      res.status(500).json({ error: error.message })
    }
  }
}

export default new ChecklistController()
