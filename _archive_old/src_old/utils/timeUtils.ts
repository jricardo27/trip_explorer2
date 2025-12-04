export const calculateEndTime = (startTime?: string, duration?: number) => {
  if (!startTime || !duration) return null
  const [hours, minutes] = startTime.split(":").map(Number)
  const date = new Date()
  date.setHours(hours, minutes)
  date.setMinutes(date.getMinutes() + duration)
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false })
}
