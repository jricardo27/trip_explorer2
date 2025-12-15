import { useMutation, useQueryClient } from "@tanstack/react-query"
import client from "../api/client"
import type { ActivityParticipant } from "../types"

export const useActivityParticipants = (activityId: string, tripId: string) => {
  const queryClient = useQueryClient()

  const addParticipant = useMutation({
    mutationFn: async (memberId: string) => {
      const response = await client.post(`/trips/${tripId}/activities/${activityId}/participants`, { memberId })
      return response.data as ActivityParticipant
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trip", tripId] })
      // Verify if we need to invalidate specific activity query if it exists
    },
  })

  const removeParticipant = useMutation({
    mutationFn: async (memberId: string) => {
      await client.delete(`/trips/${tripId}/activities/${activityId}/participants/${memberId}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trip", tripId] })
    },
  })

  return {
    addParticipant: addParticipant.mutateAsync,
    removeParticipant: removeParticipant.mutateAsync,
    isAdding: addParticipant.isPending,
    isRemoving: removeParticipant.isPending,
  }
}
