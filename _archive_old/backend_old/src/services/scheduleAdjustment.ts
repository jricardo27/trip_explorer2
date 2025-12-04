import { pool } from "../db"

interface ScheduleUpdate {
  activity_id: string
  old_start: Date
  new_start: Date
  old_end: Date
  new_end: Date
}

interface UpdatePreview {
  affected_activities: ScheduleUpdate[]
  conflicts: string[]
  total_shift_minutes: number
}

/**
 * Calculate the impact of selecting a transport alternative on downstream activities
 */
export async function calculateScheduleImpact(transportAlternativeId: string): Promise<UpdatePreview> {
  const client = await pool.connect()

  try {
    // Get transport alternative
    const transportResult = await client.query("SELECT * FROM transport_alternatives WHERE id = $1", [
      transportAlternativeId,
    ])

    if (transportResult.rows.length === 0) {
      throw new Error("Transport alternative not found")
    }

    const transport = transportResult.rows[0]

    // Get from and to activities
    const fromActivity = await client.query("SELECT * FROM activities WHERE id = $1", [transport.from_activity_id])
    const toActivity = await client.query("SELECT * FROM activities WHERE id = $1", [transport.to_activity_id])

    if (fromActivity.rows.length === 0 || toActivity.rows.length === 0) {
      throw new Error("Activities not found")
    }

    const from = fromActivity.rows[0]
    const to = toActivity.rows[0]

    // Calculate new arrival time
    const departureTime = new Date(from.scheduled_end)
    const totalMinutes = transport.duration_minutes + (transport.buffer_minutes || 0)
    const newArrivalTime = new Date(departureTime.getTime() + totalMinutes * 60000)

    // Calculate time delta
    const currentStart = new Date(to.scheduled_start)
    const timeDeltaMs = newArrivalTime.getTime() - currentStart.getTime()
    const timeDeltaMinutes = Math.round(timeDeltaMs / 60000)

    // If no change needed, return empty preview
    if (timeDeltaMinutes === 0) {
      return {
        affected_activities: [],
        conflicts: [],
        total_shift_minutes: 0,
      }
    }

    // Get downstream activities
    const downstreamResult = await client.query(
      `SELECT * FROM activities
       WHERE trip_day_id = $1
         AND scheduled_start >= $2
         AND is_flexible = TRUE
       ORDER BY scheduled_start`,
      [to.trip_day_id, to.scheduled_start],
    )

    const affectedActivities: ScheduleUpdate[] = []
    const conflicts: string[] = []

    // Calculate new times for each affected activity
    for (const activity of downstreamResult.rows) {
      const oldStart = new Date(activity.scheduled_start)
      const oldEnd = new Date(activity.scheduled_end)
      const newStart = new Date(oldStart.getTime() + timeDeltaMs)
      const newEnd = new Date(oldEnd.getTime() + timeDeltaMs)

      affectedActivities.push({
        activity_id: activity.id,
        old_start: oldStart,
        new_start: newStart,
        old_end: oldEnd,
        new_end: newEnd,
      })

      // Check for conflicts with non-flexible activities
      const conflictCheck = await client.query(
        `SELECT id FROM activities
         WHERE trip_day_id = $1
           AND id != $2
           AND is_flexible = FALSE
           AND (
             (scheduled_start, scheduled_end) OVERLAPS ($3, $4)
           )`,
        [to.trip_day_id, activity.id, newStart, newEnd],
      )

      if (conflictCheck.rows.length > 0) {
        conflicts.push(...conflictCheck.rows.map((r: { id: string }) => r.id))
      }
    }

    return {
      affected_activities: affectedActivities,
      conflicts,
      total_shift_minutes: timeDeltaMinutes,
    }
  } catch (error) {
    console.error("Error calculating schedule impact:", error)
    throw error
  } finally {
    client.release()
  }
}

/**
 * Apply schedule updates to activities (used after user confirms the preview)
 */
export async function applyScheduleUpdates(updates: ScheduleUpdate[]): Promise<void> {
  const client = await pool.connect()

  try {
    await client.query("BEGIN")

    for (const update of updates) {
      await client.query(
        `UPDATE activities
         SET scheduled_start = $1, scheduled_end = $2
         WHERE id = $3`,
        [update.new_start, update.new_end, update.activity_id],
      )
    }

    await client.query("COMMIT")
  } catch (error) {
    await client.query("ROLLBACK")
    console.error("Error applying schedule updates:", error)
    throw error
  } finally {
    client.release()
  }
}
