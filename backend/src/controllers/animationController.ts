import { Request, Response } from "express"

import prisma from "../utils/prisma"

export const getTripAnimations = async (req: Request, res: Response) => {
  const { tripId } = req.params
  try {
    const animations = await prisma.tripAnimation.findMany({
      where: { tripId },
      include: { steps: true },
      orderBy: { createdAt: "desc" },
    })
    res.json({ data: animations })
  } catch {
    res.status(500).json({ error: { message: "Failed to fetch animations" } })
  }
}

export const createAnimation = async (req: Request, res: Response) => {
  const { tripId } = req.params
  const { name, settings, steps } = req.body

  try {
    const animation = await prisma.tripAnimation.create({
      data: {
        tripId,
        name,
        settings: settings || {},
        steps: {
          create: steps?.map((step: any, index: number) => ({
            orderIndex: index,
            activityId: step.activityId,
            isVisible: step.isVisible ?? true,
            zoomLevel: step.zoomLevel,
            transportMode: step.transportMode,
            settings: step.settings || {},
          })),
        },
      },
      include: { steps: true },
    })
    res.json({ data: animation })
  } catch {
    console.error(error)
    res.status(500).json({ error: { message: "Failed to create animation" } })
  }
}

export const updateAnimation = async (req: Request, res: Response) => {
  const { id } = req.params
  const { name, settings, steps } = req.body

  try {
    // Transaction to update animation and replace steps
    const result = await prisma.$transaction(async (tx) => {
      await tx.tripAnimation.update({
        where: { id },
        data: {
          name,
          settings,
        },
      })

      if (steps) {
        await tx.tripAnimationStep.deleteMany({
          where: { animationId: id },
        })

        await tx.tripAnimationStep.createMany({
          data: steps.map((step: any, index: number) => ({
            animationId: id,
            orderIndex: index,
            activityId: step.activityId,
            isVisible: step.isVisible ?? true,
            zoomLevel: step.zoomLevel,
            transportMode: step.transportMode,
            settings: step.settings || {},
          })),
        })
      }

      return tx.tripAnimation.findUnique({
        where: { id },
        include: { steps: true },
      })
    })

    res.json({ data: result })
  } catch {
    console.error(error)
    res.status(500).json({ error: { message: "Failed to update animation" } })
  }
}

export const deleteAnimation = async (req: Request, res: Response) => {
  const { id } = req.params
  try {
    await prisma.tripAnimation.delete({
      where: { id },
    })
    res.json({ data: { success: true } })
  } catch {
    res.status(500).json({ error: { message: "Failed to delete animation" } })
  }
}
