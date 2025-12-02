import { Request, Response, NextFunction } from "express"
import jwt from "jsonwebtoken"

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production"

export interface AuthRequest extends Request {
  user?: {
    userId: string
    email: string
  }
}

export const authMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization

    if (!authHeader) {
      return res.status(401).json({ error: "No authorization header" })
    }

    const token = authHeader.split(" ")[1] // Bearer <token>

    if (!token) {
      return res.status(401).json({ error: "No token provided" })
    }

    const decoded = jwt.verify(token, JWT_SECRET) as {
      userId: string
      email: string
    }

    req.user = decoded
    next()
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({ error: "Invalid token" })
    }
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({ error: "Token expired" })
    }
    return res.status(500).json({ error: "Internal server error" })
  }
}

export const generateToken = (userId: string, email: string): string => {
  return jwt.sign({ userId, email }, JWT_SECRET, { expiresIn: "7d" })
}
