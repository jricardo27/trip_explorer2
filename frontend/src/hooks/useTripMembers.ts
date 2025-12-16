import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import client from "../api/client"
import type { TripMember, MemberRole } from "../types"

interface CreateMemberData {
  name: string
  email?: string
  role?: MemberRole
  color?: string
}

interface UpdateMemberData {
  name?: string
  email?: string
  role?: MemberRole
  color?: string
}

export const useTripMembers = (tripId: string) => {
  const queryClient = useQueryClient()

  // Fetch members
  const {
    data: members,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["trip-members", tripId],
    queryFn: async () => {
      const response = await client.get(`/trips/${tripId}/members`)
      return response.data.data as TripMember[]
    },
    enabled: !!tripId,
  })

  // Add member
  const addMember = useMutation({
    mutationFn: async (data: CreateMemberData) => {
      const response = await client.post(`/trips/${tripId}/members`, data)
      return response.data.data as TripMember
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trip-members", tripId] })
      queryClient.invalidateQueries({ queryKey: ["trip", tripId] })
    },
  })

  // Update member
  const updateMember = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateMemberData }) => {
      const response = await client.put(`/trips/${tripId}/members/${id}`, data)
      return response.data.data as TripMember
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trip-members", tripId] })
      queryClient.invalidateQueries({ queryKey: ["trip", tripId] })
    },
  })

  // Remove member
  const removeMember = useMutation({
    mutationFn: async (id: string) => {
      await client.delete(`/trips/${tripId}/members/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trip-members", tripId] })
      queryClient.invalidateQueries({ queryKey: ["trip", tripId] })
    },
  })

  return {
    members: members || [],
    isLoading,
    error,
    addMember: addMember.mutateAsync,
    updateMember: updateMember.mutateAsync,
    removeMember: removeMember.mutateAsync,
    isAddingMember: addMember.isPending,
    isUpdatingMember: updateMember.isPending,
    isRemovingMember: removeMember.isPending,
  }
}
