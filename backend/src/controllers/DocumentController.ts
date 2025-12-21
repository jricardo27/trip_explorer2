import { NextFunction, Request, Response } from "express"

import documentService from "../services/DocumentService"

class DocumentController {
  async createDocument(req: Request, res: Response, next: NextFunction) {
    try {
      const { tripId, title, url, notes, category } = req.body

      // Permission already checked by middleware (checkTripPermission("EDITOR"))

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
      const { tripId } = req.query as { tripId: string }

      if (!tripId) {
        return res.status(400).json({ error: "tripId is required" })
      }

      // Permission already checked by middleware (checkTripPermission("VIEWER"))

      const documents = await documentService.listDocumentsByTrip(tripId)
      res.json(documents)
    } catch (error) {
      next(error)
    }
  }

  async updateDocument(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params
      const data = req.body

      const document = await documentService.getDocumentById(id)
      if (!document) {
        return res.status(404).json({ error: "Document not found" })
      }

      // Permission already checked by middleware (checkTripPermission("EDITOR"))

      const updated = await documentService.updateDocument(id, data)
      res.json(updated)
    } catch (error) {
      next(error)
    }
  }

  async deleteDocument(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params

      const document = await documentService.getDocumentById(id)
      if (!document) {
        return res.status(404).json({ error: "Document not found" })
      }

      // Permission already checked by middleware (checkTripPermission("EDITOR"))

      await documentService.deleteDocument(id)
      res.status(204).send()
    } catch (error) {
      next(error)
    }
  }
}

export default new DocumentController()
