import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { tripApi } from "../api/client"
import type { CreateTripRequest, UpdateTripRequest } from "../types"

export const useTrips = (filters?: { isCompleted?: boolean; startAfter?: string; endBefore?: string }) => {
  return useQuery({
    queryKey: ["trips", filters],
    queryFn: () => tripApi.list(filters),
  })
}

export const useTrip = (tripId: string | null) => {
  return useQuery({
    queryKey: ["trip", tripId],
    queryFn: () => tripApi.get(tripId!),
    enabled: !!tripId,
  })
}

export const useCreateTrip = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: Omit<CreateTripRequest, "userId">) => tripApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trips"] })
    },
  })
}

export const useUpdateTrip = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ tripId, data }: { tripId: string; data: UpdateTripRequest }) => tripApi.update(tripId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["trips"] })
      queryClient.invalidateQueries({ queryKey: ["trip", variables.tripId] })
    },
  })
}

export const useDeleteTrip = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (tripId: string) => tripApi.delete(tripId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trips"] })
    },
  })
}

export const useCopyTrip = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ tripId, name, startDate }: { tripId: string; name: string; startDate: string }) =>
      tripApi.copy(tripId, name, startDate),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trips"] })
    },
  })
}
