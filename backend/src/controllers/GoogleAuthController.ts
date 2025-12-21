import { Request, Response } from "express"
import { OAuth2Client } from "google-auth-library"
import jwt from "jsonwebtoken"

import prisma from "../utils/prisma"

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID)

const generateToken = (userId: string) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET as string, { expiresIn: "7d" })
}

export const googleAuth = async (req: Request, res: Response) => {
  try {
    const { idToken } = req.body

    if (!idToken) {
      return res.status(400).json({ error: "Google ID Token is required" })
    }

    const ticket = await client.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    })

    const payload = ticket.getPayload()
    if (!payload || !payload.email) {
      return res.status(400).json({ error: "Invalid Google token" })
    }

    const { email, sub: googleId } = payload

    // 1. Try to find user by googleId
    let user = await prisma.user.findUnique({ where: { googleId } })

    if (!user) {
      // 2. If not found by googleId, try to find by email
      user = await prisma.user.findUnique({ where: { email } })

      if (user) {
        // Link googleId to existing user
        user = await prisma.user.update({
          where: { id: user.id },
          data: { googleId },
        })
      } else {
        // 3. Create new user
        user = await prisma.user.create({
          data: {
            email,
            googleId,
            // Since it's a social login, passwordHash remains null
          },
        })
      }
    }

    const token = generateToken(user.id)
    res.json({ data: { token, user: { id: user.id, email: user.email } } })
  } catch (error) {
    console.error("Google Auth Error:", error)
    res.status(401).json({ error: "Google Authentication failed" })
  }
}
