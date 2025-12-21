import { Request, Response, NextFunction } from "express"

import transportService from "../services/TransportService"

class TransportController {
  async createTransport(req: Request, res: Response, next: NextFunction) {
    try {
      const data = req.body

      // Permission already checked by middleware (checkTripPermission("EDITOR"))

      const transport = await transportService.createTransport(data)
      res.status(201).json(transport)
    } catch (error) {
      next(error)
    }
  }

  async listTransport(req: Request, res: Response, next: NextFunction) {
    try {
      const { tripId } = req.query as { tripId: string }

      if (!tripId) {
        return res.status(400).json({ error: "tripId is required" })
      }

      // Permission already checked by middleware (checkTripPermission("VIEWER"))

      const transport = await transportService.listTransportByTrip(tripId)
      res.json(transport)
    } catch (error) {
      next(error)
    }
  }

  async getTransport(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params

      const transport = await transportService.getTransportById(id)
      if (!transport) {
        return res.status(404).json({ error: "Transport not found" })
      }

      // Permission already checked by middleware (checkTripPermission("VIEWER"))
      res.json(transport)
    } catch (error) {
      next(error)
    }
  }

  async updateTransport(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params
      const data = req.body

      const transport = await transportService.getTransportById(id)
      if (!transport) {
        return res.status(404).json({ error: "Transport not found" })
      }

      // Permission already checked by middleware (checkTripPermission("EDITOR"))

      const updated = await transportService.updateTransport(id, data)
      res.json(updated)
    } catch (error) {
      next(error)
    }
  }

  async deleteTransport(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params

      const transport = await transportService.getTransportById(id)
      if (!transport) {
        return res.status(404).json({ error: "Transport not found" })
      }

      // Permission already checked by middleware (checkTripPermission("EDITOR"))

      await transportService.deleteTransport(id)
      res.status(204).send()
    } catch (error) {
      next(error)
    }
  }

  async selectTransport(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params

      const transport = await transportService.getTransportById(id)
      if (!transport) {
        return res.status(404).json({ error: "Transport not found" })
      }

      // Permission already checked by middleware (checkTripPermission("EDITOR"))

      const selected = await transportService.selectTransport(id)
      res.json(selected)
    } catch (error) {
      next(error)
    }
  }
}

export default new TransportController()
