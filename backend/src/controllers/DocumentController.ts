import { NextFunction, Request, Response } from "express"

import documentService from "../services/DocumentService"
import tripService from "../services/TripService"

class DocumentController {
  async createDocument(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.id
      const { tripId, title, url, notes, category } = req.body

      const trip = await tripService.getTripById(tripId, userId)
      if (!trip) {
        return res.status(403).json({ error: "Unauthorized or Trip not found" })
      }

      const document = await documentService.createDocument({
        tripId,
        title,
        url,
        notes,
        category,
      })
      res.status(201).json(document)
    } catch (error) {
      next(error)
    }
  }

  async listDocuments(req: Request, res: Response, next: NextFunction) {
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

      const documents = await documentService.listDocumentsByTrip(tripId)
      res.json(documents)
    } catch (error) {
      next(error)
    }
  }

  async updateDocument(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params
      const userId = (req as any).user.id
      const data = req.body

      const document = await documentService.getDocumentById(id)
      if (!document) {
        return res.status(404).json({ error: "Document not found" })
      }

      const trip = await tripService.getTripById(document.tripId, userId)
      if (!trip) {
        return res.status(403).json({ error: "Unauthorized" })
      }

      const updated = await documentService.updateDocument(id, data)
      res.json(updated)
    } catch (error) {
      next(error)
    }
  }

  async deleteDocument(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params
      const userId = (req as any).user.id

      const document = await documentService.getDocumentById(id)
      if (!document) {
        return res.status(404).json({ error: "Document not found" })
      }

      const trip = await tripService.getTripById(document.tripId, userId)
      if (!trip) {
        return res.status(403).json({ error: "Unauthorized" })
      }

      await documentService.deleteDocument(id)
      res.status(204).send()
    } catch (error) {
      next(error)
    }
  }
}

export default new DocumentController()
