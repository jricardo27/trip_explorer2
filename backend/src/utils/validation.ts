import { z } from "zod"

export const createTripSchema = z
  .object({
    name: z.string().min(1).max(255),
    startDate: z.string(),
    endDate: z.string(),
    budget: z.number().positive().optional(),
    defaultCurrency: z.string().length(3).optional(),
    timezone: z.string().optional(),
  })
  .refine((data) => new Date(data.endDate) >= new Date(data.startDate), {
    message: "End date must be after or equal to start date",
  })

export const updateTripSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  budget: z.number().positive().optional(),
  defaultCurrency: z.string().length(3).optional(),
  timezone: z.string().optional(),
  isCompleted: z.boolean().optional(),
  isPublic: z.boolean().optional(),
})

export const createActivitySchema = z.object({
  tripId: z.string().uuid(),
  tripDayId: z.string().uuid().optional(),
  activityType: z.enum(["ACCOMMODATION", "RESTAURANT", "ATTRACTION", "TRANSPORT", "CUSTOM"]),
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  notes: z.string().optional(),
  scheduledStart: z.preprocess((arg) => (arg === "" ? undefined : arg), z.string().datetime().optional()),
  scheduledEnd: z.preprocess((arg) => (arg === "" ? undefined : arg), z.string().datetime().optional()),
  durationMinutes: z.number().int().positive().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  countryCode: z.string().length(2).optional(),
  estimatedCost: z.number().positive().optional(),
  currency: z.string().length(3).optional(),
})

export const updateActivitySchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  notes: z.string().optional(),
  scheduledStart: z.preprocess((arg) => (arg === "" ? undefined : arg), z.string().datetime().optional()),
  scheduledEnd: z.preprocess((arg) => (arg === "" ? undefined : arg), z.string().datetime().optional()),
  actualStart: z.preprocess((arg) => (arg === "" ? undefined : arg), z.string().datetime().optional()),
  actualEnd: z.preprocess((arg) => (arg === "" ? undefined : arg), z.string().datetime().optional()),
  durationMinutes: z.number().int().positive().optional(),
  status: z.enum(["PLANNED", "IN_PROGRESS", "COMPLETED", "CANCELLED", "SKIPPED"]).optional(),
  priority: z.string().optional(),
  estimatedCost: z.number().positive().optional(),
  actualCost: z.number().positive().optional(),
  isPaid: z.boolean().optional(),
})
