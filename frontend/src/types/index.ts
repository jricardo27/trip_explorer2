// Generated from Prisma schema - keep in sync with backend

export const TransportMode = {
  FLIGHT: "FLIGHT",
  TRAIN: "TRAIN",
  BUS: "BUS",
  DRIVING: "DRIVING",
  WALKING: "WALKING",
  CYCLING: "CYCLING",
  TRANSIT: "TRANSIT",
  FERRY: "FERRY",
  RIDE_SHARE: "RIDE_SHARE",
  OTHER: "OTHER",
} as const

export type TransportMode = (typeof TransportMode)[keyof typeof TransportMode]

export const ActivityType = {
  ACCOMMODATION: "ACCOMMODATION",
  RESTAURANT: "RESTAURANT",
  ATTRACTION: "ATTRACTION",
  TRANSPORT: "TRANSPORT",
  FLIGHT: "FLIGHT",
  ACTIVITY: "ACTIVITY",
  TOUR: "TOUR",
  EVENT: "EVENT",
  LOCATION: "LOCATION",
  CUSTOM: "CUSTOM",
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
  title?: string // Aliased in some places
  description?: string
  destination?: string
  startDate: string
  endDate: string
  budget?: number
  defaultCurrency?: string
  baseCurrency?: string
  currencies?: string[]
  exchangeRates?: Record<string, number>
  timezone?: string
  status?: string
  isCompleted: boolean
  isPublic: boolean
  days?: TripDay[]
  activities?: Activity[]
  members?: TripMember[]
  expenses?: Expense[]
  budgets?: Budget[]
  transport?: TransportAlternative[]
  checklistItems?: TripChecklistItem[]
  packingItems?: TripPackingItem[]
  animations?: TripAnimation[]
  documents?: TripDocument[]
  checklistCategories?: string[]
  packingCategories?: string[]
  createdAt: string
  updatedAt: string
}

export interface TripAnimation {
  id: string
  tripId: string
  name: string
  description?: string
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
  settings: any
  activity?: Activity
}

export interface TripDay {
  id: string
  tripId: string
  dayNumber: number
  dayIndex?: number // In some places used interchangeably
  date: string
  name?: string
  notes?: string
  activities: Activity[]
  scenarios?: DayScenario[]
}

export interface DayScenario {
  id: string
  tripDayId: string
  name: string
  description?: string
  isSelected: boolean
  orderIndex: number
  activities: Activity[]
  createdAt: string
  updatedAt: string
}

export interface Activity {
  id: string
  tripId: string
  tripDayId: string
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
  isLocked?: boolean
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
  linkedGroupId?: string
  tags: string[]
  availableDays: string[]
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
  transportAlternativeId?: string
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
}

export interface UpdateTripRequest {
  name?: string
  title?: string
  startDate?: string
  endDate?: string
  budget?: number
  defaultCurrency?: string
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
}

export interface UpdateActivityRequest {
  tripDayId?: string
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
  availableDays?: string[]
}

export interface CopyTripRequest {
  id: string
  name: string
  startDate: string
}

export interface ShiftTripRequest {
  id: string
  days: number
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
  notes?: string
  splits?: { memberId: string; amount: number; percentage?: number }[]
}

export interface UpdateTransportRequest {
  name?: string
  transportMode?: TransportMode
  durationMinutes?: number
  cost?: number
  currency?: string
  description?: string
  notes?: string
  splits?: { memberId: string; amount: number; percentage?: number }[]
}

export interface ChecklistTemplate {
  id: string
  category: string
  task: string
  priority: number
}

export interface TripChecklistItem {
  id: string
  tripId: string
  task: string
  isDone: boolean
  category?: string
  priority: number
  createdAt: string
  updatedAt: string
}

export interface PackingListTemplate {
  id: string
  category: string
  item: string
  priority: number
}

export interface TripPackingItem {
  id: string
  tripId: string
  item: string
  quantity: number
  isPacked: boolean
  category?: string
  priority: number
  createdAt: string
  updatedAt: string
}

export interface TripDocument {
  id: string
  tripId: string
  title: string
  url: string
  notes?: string
  category?: string
  createdAt: string
  updatedAt: string
}

export interface CreateDocumentRequest {
  tripId: string
  title: string
  url: string
  notes?: string
  category?: string
}

export interface UpdateDocumentRequest {
  title?: string
  url?: string
  notes?: string
  category?: string
}
