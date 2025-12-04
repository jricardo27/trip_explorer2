import { query } from "../db"

interface TransportAlternative {
  id: string
  from_activity_id: string
  to_activity_id: string
  duration_minutes: number
  buffer_minutes: number
  available_from?: string
  available_to?: string
  available_days?: number[]
}

interface Activity {
  id: string
  scheduled_start: Date
  scheduled_end: Date
  is_flexible: boolean
}

interface ValidationResult {
  is_feasible: boolean
  reason?: string
  arrival_time?: Date
  conflicts?: string[]
}

/**
 * Validates if a transport alternative is feasible given the activity schedule
 */
export async function validateTransportAlternative(transportId: string): Promise<ValidationResult> {
  try {
    // Get transport alternative
    const transportResult = await query("SELECT * FROM transport_alternatives WHERE id = $1", [transportId])

    if (transportResult.rows.length === 0) {
      return {
        is_feasible: false,
        reason: "Transport alternative not found",
      }
    }

    const transport: TransportAlternative = transportResult.rows[0]

    // Get from and to activities
    const activitiesResult = await query(
      `SELECT id, scheduled_start, scheduled_end, is_flexible
       FROM activities
       WHERE id IN ($1, $2)`,
      [transport.from_activity_id, transport.to_activity_id],
    )

    if (activitiesResult.rows.length !== 2) {
      return {
        is_feasible: false,
        reason: "One or both activities not found",
      }
    }

    const fromActivity = activitiesResult.rows.find((a: Activity) => a.id === transport.from_activity_id)
    const toActivity = activitiesResult.rows.find((a: Activity) => a.id === transport.to_activity_id)

    if (!fromActivity || !toActivity) {
      return {
        is_feasible: false,
        reason: "Activities not properly loaded",
      }
    }

    // Calculate arrival time
    const departureTime = new Date(fromActivity.scheduled_end)
    const totalMinutes = transport.duration_minutes + (transport.buffer_minutes || 0)
    const arrivalTime = new Date(departureTime.getTime() + totalMinutes * 60000)

    // Check if arrival is before next activity start
    const nextActivityStart = new Date(toActivity.scheduled_start)
    const timeDiff = (nextActivityStart.getTime() - arrivalTime.getTime()) / 60000 // minutes

    if (timeDiff < 0) {
      return {
        is_feasible: false,
        reason: `Arrives ${Math.abs(Math.round(timeDiff))} minutes late`,
        arrival_time: arrivalTime,
      }
    }

    // Check time availability constraints
    if (transport.available_from || transport.available_to) {
      const departureHour = departureTime.getHours()
      const departureMinute = departureTime.getMinutes()
      const departureTimeStr = `${departureHour.toString().padStart(2, "0")}:${departureMinute.toString().padStart(2, "0")}`

      if (transport.available_from && departureTimeStr < transport.available_from) {
        return {
          is_feasible: false,
          reason: `Not available until ${transport.available_from}`,
          arrival_time: arrivalTime,
        }
      }

      if (transport.available_to && departureTimeStr > transport.available_to) {
        return {
          is_feasible: false,
          reason: `Not available after ${transport.available_to}`,
          arrival_time: arrivalTime,
        }
      }
    }

    // Check day availability
    if (transport.available_days && transport.available_days.length > 0) {
      const dayOfWeek = departureTime.getDay() // 0 = Sunday, 6 = Saturday
      if (!transport.available_days.includes(dayOfWeek)) {
        return {
          is_feasible: false,
          reason: "Not available on this day of week",
          arrival_time: arrivalTime,
        }
      }
    }

    // Check for downstream conflicts
    const downstreamResult = await query(
      `SELECT id, scheduled_start, scheduled_end
       FROM activities
       WHERE trip_day_id = (SELECT trip_day_id FROM activities WHERE id = $1)
         AND scheduled_start > $2
       ORDER BY scheduled_start`,
      [toActivity.id, toActivity.scheduled_start],
    )

    const conflicts: string[] = []
    let currentEnd = arrivalTime

    for (const activity of downstreamResult.rows) {
      const activityStart = new Date(activity.scheduled_start)
      if (currentEnd > activityStart) {
        conflicts.push(activity.id)
      }
      currentEnd = new Date(activity.scheduled_end)
    }

    if (conflicts.length > 0) {
      return {
        is_feasible: false,
        reason: `Would cause ${conflicts.length} downstream conflict(s)`,
        arrival_time: arrivalTime,
        conflicts,
      }
    }

    // All checks passed
    return {
      is_feasible: true,
      arrival_time: arrivalTime,
    }
  } catch (error) {
    console.error("Error validating transport alternative:", error)
    return {
      is_feasible: false,
      reason: "Validation error",
    }
  }
}

/**
 * Get all downstream activities that would be affected by a schedule change
 */
export async function getDownstreamActivities(activityId: string): Promise<Activity[]> {
  try {
    const result = await query(
      `SELECT a.id, a.scheduled_start, a.scheduled_end, a.is_flexible
       FROM activities a
       WHERE a.trip_day_id = (SELECT trip_day_id FROM activities WHERE id = $1)
         AND a.scheduled_start > (SELECT scheduled_start FROM activities WHERE id = $1)
       ORDER BY a.scheduled_start`,
      [activityId],
    )

    return result.rows
  } catch (error) {
    console.error("Error getting downstream activities:", error)
    return []
  }
}
