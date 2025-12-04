import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { activityApi } from '../api/client'
import type { CreateActivityRequest, UpdateActivityRequest } from '../types'

export const useActivities = (tripId: string | null, filters?: {
    tripDayId?: string
    activityType?: string
    status?: string
}) => {
    return useQuery({
        queryKey: ['activities', tripId, filters],
        queryFn: () => activityApi.list(tripId!, filters),
        enabled: !!tripId
    })
}

export const useActivity = (tripId: string | null, activityId: string | null) => {
    return useQuery({
        queryKey: ['activity', tripId, activityId],
        queryFn: () => activityApi.get(tripId!, activityId!),
        enabled: !!tripId && !!activityId
    })
}

export const useCreateActivity = () => {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: (data: CreateActivityRequest) => activityApi.create(data),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['activities', variables.tripId] })
            queryClient.invalidateQueries({ queryKey: ['trip', variables.tripId] })
        }
    })
}

export const useUpdateActivity = () => {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: ({ tripId, activityId, data }: {
            tripId: string
            activityId: string
            data: UpdateActivityRequest
        }) => activityApi.update(tripId, activityId, data),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['activities', variables.tripId] })
            queryClient.invalidateQueries({ queryKey: ['activity', variables.tripId, variables.activityId] })
            queryClient.invalidateQueries({ queryKey: ['trip', variables.tripId] })
        }
    })
}

export const useDeleteActivity = () => {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: ({ tripId, activityId }: { tripId: string; activityId: string }) =>
            activityApi.delete(tripId, activityId),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['activities', variables.tripId] })
            queryClient.invalidateQueries({ queryKey: ['trip', variables.tripId] })
        }
    })
}

export const useActivityConflicts = (tripId: string | null) => {
    return useQuery({
        queryKey: ['activity-conflicts', tripId],
        queryFn: () => activityApi.getConflicts(tripId!),
        enabled: !!tripId
    })
}
