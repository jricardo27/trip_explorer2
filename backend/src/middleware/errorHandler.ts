import { Request, Response, NextFunction } from "express"
import { ZodSchema } from "zod"

export const validate = (schema: ZodSchema) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await schema.parseAsync(req.body)
      next()
    } catch (error: any) {
      res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid request data",
          details: error.errors,
        },
      })
    }
  }
}

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  console.error("Error:", err)

  if (err.code === "P2002") {
    return res.status(409).json({
      error: {
        code: "DUPLICATE_ERROR",
        message: "Resource already exists",
        details: err.meta,
      },
    })
  }

  if (err.code === "P2025") {
    return res.status(404).json({
      error: {
        code: "NOT_FOUND",
        message: "Resource not found",
      },
    })
  }

  res.status(500).json({
    error: {
      code: "INTERNAL_ERROR",
      message: "An unexpected error occurred",
    },
  })
}
