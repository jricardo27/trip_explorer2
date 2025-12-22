import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"

import client from "../api/client"

export interface HighlightsData {
  statistics: {
    totalTrips: number
    totalActivities: number
    totalCountries: number
    totalCities: number
    firstTripDate: string | null
    lastTripDate: string | null
  }
  countries: Array<{
    id: string
    userId: string
    countryId: string
    visitCount: number
    activityCount: number
    firstVisit: string
    lastVisit: string
    country: {
      name: string
      code: string
      code3: string | null
      continent: string | null
      region: string | null
      boundary: any
      centroid: any
    }
  }>
  cities: Array<{
    id: string
    userId: string
    cityId: string
    visitCount: number
    activityCount: number
    firstVisit: string
    lastVisit: string
    city: {
      name: string
      countryCode: string
      latitude: number
      longitude: number
      boundary: any | null
      population: number | null
    }
  }>
  trips: Array<{
    id: string
    name: string
    startDate: string
    endDate: string
    activityCount: number
  }>
  activityTypes: Array<{
    type: string
    count: number
  }>
  activities: Array<{
    id: string
    name: string
    activityType: string
    city: string | null
    countryCode: string | null
    latitude: number
    longitude: number
    scheduledStart: string | null
    tripId: string
  }>
}

export const useHighlights = () => {
  return useQuery<HighlightsData>({
    queryKey: ["highlights"],
    queryFn: async () => {
      const response = await client.get("/highlights")
      return response.data
    },
  })
}

export const useRecalculateHighlights = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      const response = await client.post("/highlights/recalculate")
      return response.data
    },
    onSuccess: () => {
      // Automatically invalidate and refetch highlights data
      queryClient.invalidateQueries({ queryKey: ["highlights"] })
    },
  })
}

export const usePopulateActivityLocations = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      const response = await client.post("/highlights/populate-locations")
      return response.data
    },
    onSuccess: () => {
      // Automatically invalidate and refetch highlights data
      queryClient.invalidateQueries({ queryKey: ["highlights"] })
    },
  })
}
