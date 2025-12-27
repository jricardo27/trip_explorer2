import dayjs from "dayjs"
import { useState, useEffect } from "react"

import { useTripMembers } from "../hooks/useTripMembers"
import { useLanguageStore } from "../stores/languageStore"
import type { Activity, TripDay, ActivityType } from "../types"
import { ActivityType as ActivityTypeEnum } from "../types"

interface UseActivityFormProps {
  open: boolean
  activity?: Activity
  tripId: string
  tripDayId?: string
  tripStartDate?: string
  tripDays?: TripDay[]
  initialCoordinates?: { lat: number; lng: number }
  onSubmit: (data: any) => Promise<void>
  onClose: (event?: object, reason?: string) => void
  defaultCurrency?: string
}

export const useActivityForm = ({
  open,
  activity,
  tripId,
  tripDayId,
  tripStartDate,
  tripDays,
  initialCoordinates,
  onSubmit,
  defaultCurrency = "AUD",
}: Omit<UseActivityFormProps, "onClose">) => {
  const { t } = useLanguageStore()
  const { members } = useTripMembers(tripId)

  const [name, setName] = useState("")
  const [activityType, setActivityType] = useState<ActivityType>(ActivityTypeEnum.ATTRACTION)
  const [scheduledStart, setScheduledStart] = useState<dayjs.Dayjs | null>(null)
  const [scheduledEnd, setScheduledEnd] = useState<dayjs.Dayjs | null>(null)
  const [estimatedCost, setEstimatedCost] = useState("")
  const [actualCost, setActualCost] = useState("")
  const [currency, setCurrency] = useState(defaultCurrency)
  const [isPaid, setIsPaid] = useState(false)
  const [latitude, setLatitude] = useState("")
  const [longitude, setLongitude] = useState("")
  const [notes, setNotes] = useState("")
  const [availableDays, setAvailableDays] = useState<string[]>([])
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([])
  const [priority, setPriority] = useState<string>("normal")
  const [isLocked, setIsLocked] = useState(false)
  const [isPrivate, setIsPrivate] = useState(false)
  const [phone, setPhone] = useState("")
  const [email, setEmail] = useState("")
  const [website, setWebsite] = useState("")
  const [openingHours, setOpeningHours] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [mapPickerOpen, setMapPickerOpen] = useState(false)
  useEffect(() => {
    if (!open) return

    setError(null)
    if (activity) {
      setName(activity.name)
      setActivityType(activity.activityType)
      setScheduledStart(activity.scheduledStart ? dayjs(activity.scheduledStart) : null)
      setScheduledEnd(activity.scheduledEnd ? dayjs(activity.scheduledEnd) : null)
      setEstimatedCost(activity.estimatedCost?.toString() || "")
      setActualCost(activity.actualCost?.toString() || "")
      setCurrency(activity.currency || defaultCurrency)
      setIsPaid(activity.isPaid || false)
      setLatitude(activity.latitude?.toString() || "")
      setLongitude(activity.longitude?.toString() || "")
      setNotes(activity.notes || "")
      setAvailableDays(activity.availableDays || [])
      setSelectedMemberIds(activity.participants?.map((p) => p.memberId) || [])
      setPriority(activity.priority || "normal")
      setIsLocked(activity.isLocked || false)
      setIsPrivate(activity.isPrivate || false)
      setPhone(activity.phone || "")
      setEmail(activity.email || "")
      setWebsite(activity.website || "")
      setOpeningHours(activity.openingHours ? JSON.stringify(activity.openingHours, null, 2) : "")
    } else {
      setName("")
      setActivityType(ActivityTypeEnum.ATTRACTION)
      let defaultStart = null
      let defaultEnd = null

      if (tripDayId && tripDays) {
        const day = tripDays.find((d) => d.id === tripDayId)
        if (day) {
          defaultStart = dayjs(day.date).hour(9).minute(0).second(0)
          defaultEnd = defaultStart.add(1, "hour")
        }
      } else if (tripStartDate) {
        defaultStart = dayjs(tripStartDate).hour(9).minute(0).second(0)
        defaultEnd = defaultStart.add(1, "hour")
      }

      setScheduledStart(defaultStart)
      setScheduledEnd(defaultEnd)
      setEstimatedCost("")
      setActualCost("")
      setCurrency(defaultCurrency)
      setIsPaid(false)
      setLatitude(initialCoordinates?.lat.toString() || "")
      setLongitude(initialCoordinates?.lng.toString() || "")
      setNotes("")
      setAvailableDays([])
      setSelectedMemberIds(members.map((m) => m.id))
      setPriority("normal")
      setIsLocked(false)
      setIsPrivate(false)
      setPhone("")
      setEmail("")
      setWebsite("")
      setOpeningHours("")
    }
  }, [
    open,
    activity,
    tripDayId,
    tripDays,
    tripStartDate,
    initialCoordinates?.lat,
    initialCoordinates?.lng,
    defaultCurrency,
    members,
  ]) // Only re-initialize when meaningful props change

  const validateDates = (start: dayjs.Dayjs | null, end: dayjs.Dayjs | null) => {
    if (!start && !end) return true
    if (start && end && end.isBefore(start)) {
      setError(t("endDateBeforeStart"))
      return false
    }
    return true
  }

  const handleToggleMember = (memberId: string) => {
    setSelectedMemberIds((prev) =>
      prev.includes(memberId) ? prev.filter((id) => id !== memberId) : [...prev, memberId],
    )
  }

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateDates(scheduledStart, scheduledEnd)) return

    let finalTripDayId = activity?.tripDayId || tripDayId
    if (scheduledStart && tripDays) {
      const startDayjs = dayjs(scheduledStart)
      const matchingDay = tripDays.find((day) => dayjs(day.date).isSame(startDayjs, "day"))
      if (matchingDay) finalTripDayId = matchingDay.id
    }

    if (!finalTripDayId && !activity?.id) {
      setError("No trip day selected")
      return
    }

    try {
      await onSubmit({
        id: activity?.id,
        tripId,
        tripDayId: finalTripDayId,
        name,
        activityType,
        scheduledStart: scheduledStart?.toISOString(),
        scheduledEnd: scheduledEnd?.toISOString(),
        estimatedCost: estimatedCost ? parseFloat(estimatedCost) : undefined,
        actualCost: actualCost ? parseFloat(actualCost) : undefined,
        currency,
        isPaid,
        isLocked,
        isPrivate,
        latitude: latitude ? parseFloat(latitude) : undefined,
        longitude: longitude ? parseFloat(longitude) : undefined,
        notes,
        availableDays,
        participantIds: selectedMemberIds,
        priority,
        phone,
        email,
        website,
        openingHours: openingHours ? JSON.parse(openingHours) : undefined,
      })
    } catch (err: any) {
      setError(err.message || t("failedToSave"))
    }
  }

  return {
    name,
    setName,
    activityType,
    setActivityType,
    scheduledStart,
    setScheduledStart,
    scheduledEnd,
    setScheduledEnd,
    estimatedCost,
    setEstimatedCost,
    actualCost,
    setActualCost,
    currency,
    setCurrency,
    isPaid,
    setIsPaid,
    latitude,
    setLatitude,
    longitude,
    setLongitude,
    notes,
    setNotes,
    availableDays,
    setAvailableDays,
    selectedMemberIds,
    setSelectedMemberIds,
    priority,
    setPriority,
    isLocked,
    setIsLocked,
    isPrivate,
    setIsPrivate,
    phone,
    setPhone,
    email,
    setEmail,
    website,
    setWebsite,
    openingHours,
    setOpeningHours,
    error,
    setError,
    mapPickerOpen,
    setMapPickerOpen,
    members,
    handleToggleMember,
    handleFormSubmit,
  }
}
