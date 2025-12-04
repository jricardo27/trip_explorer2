import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { tripApi } from '../api/client'
import type { CreateTripRequest, UpdateTripRequest } from '../types'

export const useTrips = (userId: string | null, filters?: {
    isCompleted?: boolean
    startAfter?: string
    endBefore?: string
}) => {
    return useQuery({
        queryKey: ['trips', userId, filters],
        queryFn: () => tripApi.list(userId!, filters),
        enabled: !!userId
    })
}

export const useTrip = (tripId: string | null, userId: string | null) => {
    return useQuery({
        queryKey: ['trip', tripId, userId],
        queryFn: () => tripApi.get(tripId!, userId!),
        enabled: !!tripId && !!userId
    })
}

export const useCreateTrip = () => {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: (data: CreateTripRequest) => tripApi.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['trips'] })
        }
    })
}

export const useUpdateTrip = () => {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: ({ tripId, userId, data }: {
            tripId: string
            userId: string
            data: UpdateTripRequest
        }) => tripApi.update(tripId, userId, data),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['trips'] })
            queryClient.invalidateQueries({ queryKey: ['trip', variables.tripId] })
        }
    })
}

export const useDeleteTrip = () => {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: ({ tripId, userId }: { tripId: string; userId: string }) =>
            tripApi.delete(tripId, userId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['trips'] })
        }
    })
}

export const useCopyTrip = () => {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: ({ tripId, userId, name, startDate }: {
            tripId: string
            userId: string
            name: string
            startDate: string
        }) => tripApi.copy(tripId, userId, name, startDate),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['trips'] })
        }
    })
}
