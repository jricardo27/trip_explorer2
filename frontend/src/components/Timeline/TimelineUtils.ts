import dayjs from "dayjs"

import type { Activity } from "../../types"

// Helper to convert time to pixel position from day start
export const getPixelPosition = (time: string, dayStart: string, hourHeight: number): number => {
  const t = dayjs(time)
  const start = dayjs(dayStart).startOf("day")
  const minutes = t.diff(start, "minute")
  return (minutes / 60) * hourHeight
}

// Helper to calculate activity height based on duration
export const getActivityHeight = (start: string, end: string, hourHeight: number, minHeight: number): number => {
  const durationMinutes = dayjs(end).diff(dayjs(start), "minute")
  const height = (durationMinutes / 60) * hourHeight
  return Math.max(height, minHeight)
}

// Detect if two activities overlap
export const activitiesOverlap = (a: Activity, b: Activity): boolean => {
  if (!a.scheduledStart || !b.scheduledStart) return false
  const aEnd = a.scheduledEnd || dayjs(a.scheduledStart).endOf("day").toISOString()
  const bEnd = b.scheduledEnd || dayjs(b.scheduledStart).endOf("day").toISOString()
  return dayjs(a.scheduledStart).isBefore(dayjs(bEnd)) && dayjs(b.scheduledStart).isBefore(dayjs(aEnd))
}

// Group overlapping activities into lanes
export const calculateActivityLanes = (activities: Activity[]): Map<string, { lane: number; totalLanes: number }> => {
  const sorted = [...activities].sort((a, b) => {
    if (!a.scheduledStart || !b.scheduledStart) return 0
    return dayjs(a.scheduledStart).diff(dayjs(b.scheduledStart))
  })

  const lanes = new Map<string, { lane: number; totalLanes: number }>()
  const activeLanes: (Activity | null)[] = []

  sorted.forEach((activity) => {
    if (!activity.scheduledStart) return

    let laneIndex = 0
    while (laneIndex < activeLanes.length) {
      const laneActivity = activeLanes[laneIndex]
      if (!laneActivity || !activitiesOverlap(activity, laneActivity)) {
        break
      }
      laneIndex++
    }

    activeLanes[laneIndex] = activity

    activeLanes.forEach((laneActivity, idx) => {
      if (
        laneActivity &&
        dayjs(laneActivity.scheduledEnd || dayjs(laneActivity.scheduledStart).endOf("day")).isBefore(
          dayjs(activity.scheduledStart),
        )
      ) {
        activeLanes[idx] = null
      }
    })

    const totalLanes = activeLanes.filter((a) => a !== null).length
    lanes.set(activity.id, { lane: laneIndex, totalLanes })
  })

  return lanes
}
