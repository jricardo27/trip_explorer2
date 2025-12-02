export interface TransportAlternative {
  id: string
  trip_id: string
  from_activity_id: string
  to_activity_id: string
  name: string
  transport_mode: "driving" | "walking" | "cycling" | "transit" | "flight" | "train" | "bus" | "ferry" | "other"
  duration_minutes: number
  buffer_minutes: number
  cost?: number
  currency?: string
  description?: string
  notes?: string
  pros?: string[]
  cons?: string[]
  is_selected: boolean
  created_at: string
  updated_at: string
}

export interface ValidationResult {
  is_feasible: boolean
  reason?: string
  arrival_time?: string
  conflicts?: string[]
}

export interface ScheduleUpdate {
  activity_id: string
  old_start: string
  new_start: string
  old_end: string
  new_end: string
}

export interface UpdatePreview {
  affected_activities: ScheduleUpdate[]
  conflicts: string[]
  total_shift_minutes: number
}

export interface RouteRequest {
  from: { lat: number; lng: number }
  to: { lat: number; lng: number }
  mode?: "driving" | "walking" | "cycling"
}

export interface RouteResponse {
  duration_minutes: number
  distance_meters: number
  geometry: {
    type: "LineString"
    coordinates: number[][]
  }
  waypoints?: Array<{ lat: number; lng: number }>
  estimated?: boolean
  error?: string
}
