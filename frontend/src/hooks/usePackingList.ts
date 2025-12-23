import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"

import { packingApi } from "../api/client"
import type { TripPackingItem, PackingListTemplate } from "../types"

export const usePackingList = (tripId: string) => {
  const queryClient = useQueryClient()

  const { data: items = [], isLoading } = useQuery<TripPackingItem[]>({
    queryKey: ["packing", tripId],
    queryFn: () => packingApi.listTripItems(tripId),
  })

  const { data: templates = [] } = useQuery<PackingListTemplate[]>({
    queryKey: ["packing-templates"],
    queryFn: () => packingApi.listTemplates(),
  })

  const addItemMutation = useMutation({
    mutationFn: (data: { item: string; category?: string; quantity?: number; priority?: number }) =>
      packingApi.createTripItem(tripId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["packing", tripId] })
    },
  })

  const updateItemMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<TripPackingItem> }) => packingApi.updateTripItem(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["packing", tripId] })
    },
  })

  const deleteItemMutation = useMutation({
    mutationFn: (id: string) => packingApi.deleteTripItem(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["packing", tripId] })
    },
  })

  const importTemplatesMutation = useMutation({
    mutationFn: (templateIds: string[]) => packingApi.importTemplates(tripId, templateIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["packing", tripId] })
    },
  })

  return {
    items,
    templates,
    isLoading,
    addItem: addItemMutation.mutateAsync,
    updateItem: updateItemMutation.mutateAsync,
    deleteItem: deleteItemMutation.mutateAsync,
    importTemplates: importTemplatesMutation.mutateAsync,
    isProcessing:
      addItemMutation.isPending ||
      updateItemMutation.isPending ||
      deleteItemMutation.isPending ||
      importTemplatesMutation.isPending,
  }
}
