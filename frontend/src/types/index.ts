// Generated from Prisma schema - keep in sync with backend

export const TransportMode = {
  FLIGHT: "FLIGHT",
  TRAIN: "TRAIN",
  BUS: "BUS",
  CAR: "CAR",
  WALK: "WALK",
  BOAT: "BOAT",
  OTHER: "OTHER", // Make sure this matches backend if needed, or remove if not present in schema enum normally
  // Aliases or additional modes used in code
  DRIVING: "DRIVING",
  WALKING: "WALKING",
  CYCLING: "CYCLING",
  TRANSIT: "TRANSIT",
  FERRY: "FERRY",
} as const

export type TransportMode = (typeof TransportMode)[keyof typeof TransportMode]

export const ActivityType = {
  ACCOMMODATION: "ACCOMMODATION",
  RESTAURANT: "RESTAURANT", // Was DINING
  ATTRACTION: "ATTRACTION",
  TRANSPORT: "TRANSPORT",
  CUSTOM: "CUSTOM", // Was OTHER
} as const

export type ActivityType = (typeof ActivityType)[keyof typeof ActivityType]

export const ActivityStatus = {
  PLANNED: "PLANNED",
  BOOKED: "BOOKED",
  CONFIRMED: "CONFIRMED",
  COMPLETED: "COMPLETED",
  CANCELLED: "CANCELLED",
} as const
export type ActivityStatus = (typeof ActivityStatus)[keyof typeof ActivityStatus]

export const MemberRole = {
  OWNER: "OWNER",
  EDITOR: "EDITOR",
  VIEWER: "VIEWER",
} as const

export type MemberRole = (typeof MemberRole)[keyof typeof MemberRole]

export interface TransportSegment {
  id: string
  activityId: string
  mode: TransportMode
  departureTime?: string
  arrivalTime?: string
  carrier?: string
  icon?: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  details?: any
}

export interface User {
  id: string
  email: string
  name?: string
  createdAt: string
  updatedAt: string
}

export interface Trip {
  id: string
  userId: string
  name: string
  startDate: string
  endDate: string
  budget?: number
  defaultCurrency?: string
  currencies?: string[]
  exchangeRates?: Record<string, number>
  timezone?: string
  isCompleted: boolean
  isPublic: boolean
  days?: TripDay[]
  activities?: Activity[]
  members?: TripMember[]
  budgets?: Budget[]
  transport?: TransportAlternative[]
  animations?: TripAnimation[]
  createdAt: string
  updatedAt: string
}

export interface TripAnimation {
  id: string
  tripId: string
  name: string
  description?: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  settings: any
  steps: TripAnimationStep[]
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

export interface TripAnimationStep {
  id: string
  animationId: string
  activityId?: string
  orderIndex: number
  isVisible: boolean
  customLabel?: string
  zoomLevel?: number
  transportMode?: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  settings: any
  activity?: Activity
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
  latitude?: number
  longitude?: number
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
  participants?: ActivityParticipant[]
  bookingReference?: string
  bookingUrl?: string
  confirmationNumber?: string
  requiresBooking: boolean
  bookingDeadline?: string
  phone?: string
  email?: string
  website?: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

export interface ActivityParticipant {
  id: string
  activityId: string
  memberId: string
  member: TripMember
  createdAt: string
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

export interface ExpenseSplit {
  id: string
  expenseId: string
  memberId: string
  amount: number
  percentage?: number
  isPaid: boolean
}

export interface Expense {
  id: string
  tripId: string
  activityId?: string
  description: string
  category: string
  amount: number
  currency: string
  paidById?: string
  paymentDate?: string
  isPaid: boolean
  splitType: string
  splits?: ExpenseSplit[]
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
  currencies?: string[]
  exchangeRates?: Record<string, number>
  timezone?: string
}

export interface UpdateTripRequest {
  name?: string
  startDate?: string
  endDate?: string
  budget?: number
  defaultCurrency?: string
  currencies?: string[]
  exchangeRates?: Record<string, number>
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
  participantIds?: string[]
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
  participantIds?: string[]
}

export interface TransportAlternative {
  id: string
  tripId: string
  fromActivityId: string
  toActivityId: string
  name: string
  transportMode: TransportMode
  isSelected: boolean
  durationMinutes: number
  bufferMinutes: number
  cost?: number
  currency?: string
  costPerPerson: boolean
  distanceMeters?: number
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  waypoints?: any
  description?: string
  notes?: string
  pros: string[]
  cons: string[]
  requiresBooking: boolean
  bookingUrl?: string
  bookingReference?: string
  isFeasible: boolean
  infeasibilityReason?: string
  createdAt: string
  updatedAt: string
}

export interface CreateTransportRequest {
  tripId: string
  fromActivityId: string
  toActivityId: string
  transportMode: TransportMode
  name?: string
  durationMinutes: number
  cost?: number
  currency?: string
  description?: string
}
