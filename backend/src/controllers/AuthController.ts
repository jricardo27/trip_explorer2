import bcrypt from "bcryptjs"
import { Request, Response, NextFunction } from "express"
import jwt from "jsonwebtoken"
import { z } from "zod"

import prisma from "../utils/prisma"

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
})

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
})

const generateToken = (userId: string) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET as string, { expiresIn: "7d" })
}

export const signup = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = signupSchema.parse(req.body)

    const existingUser = await prisma.user.findUnique({ where: { email } })
    if (existingUser) {
      return res.status(400).json({ error: "User already exists" })
    }

    const passwordHash = await bcrypt.hash(password, 10)
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
      },
    })

    const token = generateToken(user.id)
    res.status(201).json({ data: { token, user: { id: user.id, email: user.email } } })
  } catch (error) {
    next(error)
  }
}

export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = loginSchema.parse(req.body)

    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" })
    }

    const isValidPassword = await bcrypt.compare(password, user.passwordHash)
    if (!isValidPassword) {
      return res.status(401).json({ error: "Invalid credentials" })
    }

    const token = generateToken(user.id)
    res.json({ data: { token, user: { id: user.id, email: user.email } } })
  } catch (error) {
    next(error)
  }
}
