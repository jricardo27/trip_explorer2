// Generated from Prisma schema - keep in sync with backend
export enum ActivityType {
  ACCOMMODATION = "ACCOMMODATION",
  RESTAURANT = "RESTAURANT",
  ATTRACTION = "ATTRACTION",
  TRANSPORT = "TRANSPORT",
  CUSTOM = "CUSTOM",
}

export enum ActivityStatus {
  PLANNED = "PLANNED",
  IN_PROGRESS = "IN_PROGRESS",
  COMPLETED = "COMPLETED",
  CANCELLED = "CANCELLED",
  SKIPPED = "SKIPPED",
}

export enum TransportMode {
  DRIVING = "DRIVING",
  WALKING = "WALKING",
  CYCLING = "CYCLING",
  TRANSIT = "TRANSIT",
  FLIGHT = "FLIGHT",
  TRAIN = "TRAIN",
  BUS = "BUS",
  FERRY = "FERRY",
  OTHER = "OTHER",
}

export enum MemberRole {
  OWNER = "OWNER",
  EDITOR = "EDITOR",
  VIEWER = "VIEWER",
}

export interface User {
  id: string
  email: string
  createdAt: string
}

export interface Trip {
  id: string
  userId: string
  name: string
  startDate: string
  endDate: string
  budget?: number
  defaultCurrency?: string
  timezone?: string
  isCompleted: boolean
  isPublic: boolean
  days?: TripDay[]
  activities?: Activity[]
  members?: TripMember[]
  budgets?: Budget[]
  createdAt: string
  updatedAt: string
}

export interface TripDay {
  id: string
  tripId: string
  dayIndex: number
  date: string
  name?: string
  notes?: string
  activities?: Activity[]
}

export interface Activity {
  id: string
  tripId: string
  tripDayId?: string
  activityType: ActivityType
  activitySubtype?: string
  category?: string
  name: string
  description?: string
  notes?: string
  address?: string
  city?: string
  country?: string
  countryCode?: string
  scheduledStart?: string
  scheduledEnd?: string
  actualStart?: string
  actualEnd?: string
  durationMinutes?: number
  isAllDay: boolean
  isFlexible: boolean
  status: ActivityStatus
  priority?: string
  orderIndex?: number
  bookingReference?: string
  bookingUrl?: string
  confirmationNumber?: string
  requiresBooking: boolean
  bookingDeadline?: string
  phone?: string
  email?: string
  website?: string
  openingHours?: any
  estimatedCost?: number
  actualCost?: number
  currency?: string
  costCategory?: string
  isPaid: boolean
  paymentMethod?: string
  useDefaultMembers: boolean
  isGroupActivity: boolean
  source?: string
  externalId?: string
  tags: string[]
  tripDay?: TripDay
  createdAt: string
  updatedAt: string
}

export interface TripMember {
  id: string
  tripId: string
  userId?: string
  name: string
  email?: string
  role: MemberRole
  avatarUrl?: string
  color?: string
  createdAt: string
}

export interface Budget {
  id: string
  tripId: string
  category: string
  amount: number
  currency: string
  spentAmount: number
  alertThresholdPercentage: number
  alertSent: boolean
  notes?: string
  createdAt: string
  updatedAt: string
}

// API Request/Response types
export interface ApiResponse<T> {
  data: T
}

export interface ApiError {
  error: {
    code: string
    message: string
    details?: any
  }
}

export interface CreateTripRequest {
  userId: string
  name: string
  startDate: string
  endDate: string
  budget?: number
  defaultCurrency?: string
  timezone?: string
}

export interface UpdateTripRequest {
  name?: string
  startDate?: string
  endDate?: string
  budget?: number
  defaultCurrency?: string
  timezone?: string
  isCompleted?: boolean
  isPublic?: boolean
}

export interface CreateActivityRequest {
  tripId: string
  tripDayId?: string
  activityType: ActivityType
  name: string
  description?: string
  notes?: string
  scheduledStart?: string
  scheduledEnd?: string
  durationMinutes?: number
  city?: string
  country?: string
  countryCode?: string
  estimatedCost?: number
  currency?: string
}

export interface UpdateActivityRequest {
  name?: string
  description?: string
  notes?: string
  scheduledStart?: string
  scheduledEnd?: string
  actualStart?: string
  actualEnd?: string
  durationMinutes?: number
  status?: ActivityStatus
  priority?: string
  estimatedCost?: number
  actualCost?: number
  isPaid?: boolean
}
