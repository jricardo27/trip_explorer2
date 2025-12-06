import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { transportApi } from "../api/client"
import client from "../api/client"
import type { Trip, Activity, CreateActivityRequest, UpdateActivityRequest, ApiResponse } from "../types"

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
    mutationFn: async (updates: { activityId: string; orderIndex: number; tripDayId?: string }[]) => {
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

  return {
    trip,
    isLoading,
    error,
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
  }
}
