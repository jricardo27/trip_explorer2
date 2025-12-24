import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"

import client, { transportApi } from "../api/client"
import type { Trip, Activity, CreateActivityRequest, UpdateActivityRequest, TripAnimation, ApiResponse } from "../types"

export const useTripDetails = (tripId: string) => {
  const queryClient = useQueryClient()

  const {
    data: trip,
    isLoading,
    error,
  } = useQuery<Trip>({
    queryKey: ["trips", tripId],
    queryFn: async () => {
      const response = await client.get<ApiResponse<Trip>>(`/trips/${tripId}`)
      return response.data.data
    },
  })

  const updateTripMutation = useMutation({
    mutationFn: async (data: Partial<Trip>) => {
      const response = await client.put<ApiResponse<Trip>>(`/trips/${tripId}`, data)
      return response.data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trips", tripId] })
    },
  })

  const createActivityMutation = useMutation({
    mutationFn: async (newActivity: CreateActivityRequest) => {
      const response = await client.post<ApiResponse<Activity>>("/activities", newActivity)
      return response.data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trips", tripId] })
    },
  })

  const updateActivityMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateActivityRequest }) => {
      const response = await client.put<ApiResponse<Activity>>(`/activities/${id}`, data)
      return response.data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trips", tripId] })
    },
  })

  const deleteActivityMutation = useMutation({
    mutationFn: async (activityId: string) => {
      await client.delete(`/activities/${activityId}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trips", tripId] })
    },
  })

  const reorderActivitiesMutation = useMutation({
    mutationFn: async (
      updates: {
        activityId: string
        orderIndex: number
        tripDayId?: string
        scheduledStart?: string | null
        scheduledEnd?: string | null
      }[],
    ) => {
      await client.post("/activities/reorder", { tripId, updates })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trips", tripId] })
    },
  })

  const createTransportMutation = useMutation({
    mutationFn: transportApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trips", tripId] })
    },
  })

  const deleteTransportMutation = useMutation({
    mutationFn: transportApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trips", tripId] })
    },
  })

  const selectTransportMutation = useMutation({
    mutationFn: transportApi.select,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trips", tripId] })
    },
  })

  // Animation Mutations
  const createAnimationMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await client.post(`/animations/trip/${tripId}`, data)
      return response.data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trips", tripId] })
    },
  })

  const updateAnimationMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
      const response = await client.put(`/animations/${id}`, updates)
      return response.data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trips", tripId] })
    },
  })

  const deleteAnimationMutation = useMutation({
    mutationFn: async (id: string) => {
      await client.delete(`/animations/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trips", tripId] })
    },
  })

  // Day Operations
  const moveActivitiesMutation = useMutation({
    mutationFn: async ({ dayId, targetDayId }: { dayId: string; targetDayId: string }) => {
      await client.post(`/trips/${tripId}/days/${dayId}/move-activities`, { targetDayId })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trips", tripId] })
    },
  })

  const swapDaysMutation = useMutation({
    mutationFn: async ({ dayId1, dayId2 }: { dayId1: string; dayId2: string }) => {
      await client.post(`/trips/${tripId}/days/swap`, { dayId1, dayId2 })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trips", tripId] })
    },
  })

  const moveDayMutation = useMutation({
    mutationFn: async ({ dayId, newDate }: { dayId: string; newDate: Date }) => {
      await client.put(`/trips/${tripId}/days/${dayId}/move`, { newDate })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trips", tripId] })
    },
  })

  // Day Rename/Notes (General Update)
  // Day Rename/Notes (General Update)
  const updateDayMutation = useMutation({
    mutationFn: async ({ dayId, updates }: { dayId: string; updates: { name?: string; notes?: string } }) => {
      const response = await client.put(`/trips/${tripId}/days/${dayId}`, updates)
      return response.data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trips", tripId] })
    },
  })

  // Scenario Mutations
  const createScenarioMutation = useMutation({
    mutationFn: async ({ tripDayId, name, description }: { tripDayId: string; name: string; description?: string }) => {
      const response = await client.post(`/scenarios/days/${tripDayId}/scenarios`, { name, description })
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trips", tripId] })
    },
  })

  const selectScenarioMutation = useMutation({
    mutationFn: async (scenarioId: string) => {
      if (!scenarioId) return // Handle deselect if needed
      const response = await client.post(`/scenarios/scenarios/${scenarioId}/select`)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trips", tripId] })
    },
  })

  const updateScenarioMutation = useMutation({
    mutationFn: async ({
      tripDayId,
      scenarioId,
      data,
    }: {
      tripDayId: string
      scenarioId: string
      data: { name: string; description?: string }
    }) => {
      const response = await client.put(`/scenarios/days/${tripDayId}/scenarios/${scenarioId}`, data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trips", tripId] })
    },
  })

  return {
    trip,
    isLoading,
    error,
    updateTrip: updateTripMutation.mutateAsync,
    isUpdatingTrip: updateTripMutation.isPending,
    createActivity: createActivityMutation.mutateAsync,
    isCreating: createActivityMutation.isPending,
    updateActivity: updateActivityMutation.mutateAsync,
    isUpdating: updateActivityMutation.isPending,
    deleteActivity: deleteActivityMutation.mutateAsync,
    isDeleting: deleteActivityMutation.isPending,
    reorderActivities: reorderActivitiesMutation.mutateAsync,
    isReordering: reorderActivitiesMutation.isPending,
    createTransport: createTransportMutation.mutateAsync,
    deleteTransport: deleteTransportMutation.mutateAsync,
    selectTransport: selectTransportMutation.mutateAsync,

    createAnimation: (data: any) => createAnimationMutation.mutateAsync(data),
    updateAnimation: (id: string, updates: Partial<TripAnimation>) => updateAnimationMutation.mutate({ id, updates }),
    deleteAnimation: (id: string) => deleteAnimationMutation.mutate(id),
    isCreatingAnimation: createAnimationMutation.isPending,
    moveActivities: moveActivitiesMutation.mutateAsync,
    swapDays: swapDaysMutation.mutateAsync,
    moveDay: moveDayMutation.mutateAsync,
    updateDay: updateDayMutation.mutateAsync,
    createScenario: createScenarioMutation.mutateAsync,
    selectScenario: selectScenarioMutation.mutateAsync,
    updateScenario: updateScenarioMutation.mutateAsync,
  }
}
