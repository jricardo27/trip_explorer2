import React, { createContext, useState, useContext, useCallback, useEffect } from "react"

import SavedFeaturesContext from "./SavedFeaturesContext"

export interface TripDay {
  id: string
  trip_id: string
  day_index: number
  date: string
}

export interface Trip {
  id: string
  user_id: string
  name: string
  start_date: string
  end_date: string
  days?: TripDay[]
}

export interface DayLocation {
  id: string
  trip_day_id: string
  country: string
  country_code?: string
  city?: string
  town?: string
  latitude?: number
  longitude?: number
  visit_order: number
  notes?: string
  created_at: string
}

interface TripContextType {
  trips: Trip[]
  currentTrip: Trip | null
  dayFeatures: Record<string, unknown[]>
  dayLocations: Record<string, DayLocation[]>
  loading: boolean
  fetchTrips: () => Promise<void>
  fetchTripDetails: (id: string) => Promise<void>
  fetchDayFeatures: (dayId: string) => Promise<void>
  fetchDayLocations: (dayId: string) => Promise<void>
  addLocationToDay: (dayId: string, location: Omit<DayLocation, "id" | "trip_day_id" | "created_at">) => Promise<void>
  deleteLocation: (locationId: string, dayId: string) => Promise<void>
  addFeatureToDay: (dayId: string, feature: unknown) => Promise<void>
  createTrip: (name: string, startDate: string, endDate: string) => Promise<void>
  deleteTrip: (id: string) => Promise<void>
  setCurrentTrip: (trip: Trip | null) => void
}

const TripContext = createContext<TripContextType | undefined>(undefined)

export const TripProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [trips, setTrips] = useState<Trip[]>([])
  const [currentTrip, setCurrentTrip] = useState<Trip | null>(null)
  const [dayFeatures, setDayFeatures] = useState<Record<string, unknown[]>>({})
  const [dayLocations, setDayLocations] = useState<Record<string, DayLocation[]>>({})
  const [loading, setLoading] = useState(false)

  const { userId } = useContext(SavedFeaturesContext)!

  const API_URL = import.meta.env.VITE_API_URL || ""

  const fetchTrips = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    try {
      const response = await fetch(`${API_URL}/api/trips?user_id=${userId}`)
      if (response.ok) {
        const data = await response.json()
        setTrips(data)
      }
    } catch (error) {
      console.error("Failed to fetch trips:", error)
    } finally {
      setLoading(false)
    }
  }, [userId, API_URL])

  const fetchTripDetails = useCallback(async (id: string) => {
    setLoading(true)
    try {
      const response = await fetch(`${API_URL}/api/trips/${id}`)
      if (response.ok) {
        const data = await response.json()
        setCurrentTrip(data)
      }
    } catch (error) {
      console.error("Failed to fetch trip details:", error)
    } finally {
      setLoading(false)
    }
  }, [API_URL])

  const createTrip = async (name: string, startDate: string, endDate: string) => {
    if (!userId) return
    setLoading(true)
    try {
      const response = await fetch(`${API_URL}/api/trips`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, name, start_date: startDate, end_date: endDate }),
      })
      if (response.ok) {
        await fetchTrips()
      } else {
        throw new Error("Failed to create trip")
      }
    } catch (error) {
      console.error(error)
      throw error
    } finally {
      setLoading(false)
    }
  }

  const deleteTrip = async (id: string) => {
    setLoading(true)
    try {
      const response = await fetch(`${API_URL}/api/trips/${id}`, {
        method: "DELETE",
      })
      if (response.ok) {
        await fetchTrips()
        if (currentTrip?.id === id) {
          setCurrentTrip(null)
        }
      }
    } catch (error) {
      console.error("Failed to delete trip:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchDayFeatures = useCallback(async (dayId: string) => {
    try {
      const response = await fetch(`${API_URL}/api/trip-days/${dayId}/features`)
      if (response.ok) {
        const data = await response.json()
        setDayFeatures((prev) => ({ ...prev, [dayId]: data }))
      }
    } catch (error) {
      console.error("Failed to fetch day features:", error)
    }
  }, [API_URL])

  const addFeatureToDay = async (dayId: string, feature: unknown) => {
    if (!userId) return
    try {
      const response = await fetch(`${API_URL}/api/features`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userId,
          list_name: "trip_features",
          feature,
          trip_day_id: dayId,
        }),
      })
      if (response.ok) {
        await fetchDayFeatures(dayId)
      }
    } catch (error) {
      console.error("Failed to add feature to day:", error)
      throw error
    }
  }

  const fetchDayLocations = useCallback(async (dayId: string) => {
    try {
      const response = await fetch(`${API_URL}/api/trip-days/${dayId}/locations`)
      if (response.ok) {
        const data = await response.json()
        setDayLocations((prev) => ({ ...prev, [dayId]: data }))
      }
    } catch (error) {
      console.error("Failed to fetch day locations:", error)
    }
  }, [API_URL])

  const addLocationToDay = async (dayId: string, location: Omit<DayLocation, "id" | "trip_day_id" | "created_at">) => {
    try {
      const response = await fetch(`${API_URL}/api/trip-days/${dayId}/locations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(location),
      })
      if (response.ok) {
        await fetchDayLocations(dayId)
      }
    } catch (error) {
      console.error("Failed to add location to day:", error)
      throw error
    }
  }

  const deleteLocation = async (locationId: string, dayId: string) => {
    try {
      const response = await fetch(`${API_URL}/api/day-locations/${locationId}`, {
        method: "DELETE",
      })
      if (response.ok) {
        await fetchDayLocations(dayId)
      }
    } catch (error) {
      console.error("Failed to delete location:", error)
      throw error
    }
  }

  useEffect(() => {
    fetchTrips()
  }, [fetchTrips])

  return (
    <TripContext.Provider
      value={{
        trips,
        currentTrip,
        dayFeatures,
        dayLocations,
        loading,
        fetchTrips,
        fetchTripDetails,
        fetchDayFeatures,
        fetchDayLocations,
        addLocationToDay,
        deleteLocation,
        addFeatureToDay,
        createTrip,
        deleteTrip,
        setCurrentTrip,
      }}
    >
      {children}
    </TripContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export const useTripContext = () => {
  const context = useContext(TripContext)
  if (!context) {
    throw new Error("useTripContext must be used within a TripProvider")
  }
  return context
}

export default TripContext
