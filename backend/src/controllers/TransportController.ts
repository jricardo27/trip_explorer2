import { Request, Response, NextFunction } from "express"
import transportService from "../services/TransportService"
import tripService from "../services/TripService"

class TransportController {
    async createTransport(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = (req as any).user.id
            const data = req.body

            // Validate permission
            const trip = await tripService.getTripById(data.tripId, userId)
            if (!trip) {
                return res.status(403).json({ error: "Unauthorized or Trip not found" })
            }

            const transport = await transportService.createTransport(data)
            res.status(201).json(transport)
        } catch (error) {
            next(error)
        }
    }

    async listTransport(req: Request, res: Response, next: NextFunction) {
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

            const transport = await transportService.listTransportByTrip(tripId)
            res.json(transport)
        } catch (error) {
            next(error)
        }
    }

    async getTransport(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = (req as any).user.id
            const { id } = req.params

            const transport = await transportService.getTransportById(id)
            if (!transport) {
                return res.status(404).json({ error: "Transport not found" })
            }

            const trip = await tripService.getTripById(transport.tripId, userId)
            if (!trip) {
                return res.status(403).json({ error: "Unauthorized" })
            }

            res.json(transport)
        } catch (error) {
            next(error)
        }
    }

    async updateTransport(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = (req as any).user.id
            const { id } = req.params
            const data = req.body

            const transport = await transportService.getTransportById(id)
            if (!transport) {
                return res.status(404).json({ error: "Transport not found" })
            }

            const trip = await tripService.getTripById(transport.tripId, userId)
            if (!trip) {
                return res.status(403).json({ error: "Unauthorized" })
            }

            const updated = await transportService.updateTransport(id, data)
            res.json(updated)
        } catch (error) {
            next(error)
        }
    }

    async deleteTransport(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = (req as any).user.id
            const { id } = req.params

            const transport = await transportService.getTransportById(id)
            if (!transport) {
                return res.status(404).json({ error: "Transport not found" })
            }

            const trip = await tripService.getTripById(transport.tripId, userId)
            if (!trip) {
                return res.status(403).json({ error: "Unauthorized" })
            }

            await transportService.deleteTransport(id)
            res.status(204).send()
        } catch (error) {
            next(error)
        }
    }

    async selectTransport(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = (req as any).user.id
            const { id } = req.params

            const transport = await transportService.getTransportById(id)
            if (!transport) {
                return res.status(404).json({ error: "Transport not found" })
            }

            const trip = await tripService.getTripById(transport.tripId, userId)
            if (!trip) {
                return res.status(403).json({ error: "Unauthorized" })
            }

            const selected = await transportService.selectTransport(id)
            res.json(selected)
        } catch (error) {
            next(error)
        }
    }
}

export default new TransportController()
