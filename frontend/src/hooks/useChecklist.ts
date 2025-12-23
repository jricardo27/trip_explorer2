import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"

import { checklistApi } from "../api/client"
import type { TripChecklistItem, ChecklistTemplate } from "../types"

export const useChecklist = (tripId: string) => {
  const queryClient = useQueryClient()

  const { data: items = [], isLoading } = useQuery<TripChecklistItem[]>({
    queryKey: ["checklists", tripId],
    queryFn: () => checklistApi.listTripItems(tripId),
  })

  const { data: templates = [] } = useQuery<ChecklistTemplate[]>({
    queryKey: ["checklist-templates"],
    queryFn: () => checklistApi.listTemplates(),
  })

  const addItemMutation = useMutation({
    mutationFn: (data: { task: string; category?: string; priority?: number }) =>
      checklistApi.createTripItem(tripId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["checklists", tripId] })
    },
  })

  const updateItemMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<TripChecklistItem> }) =>
      checklistApi.updateTripItem(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["checklists", tripId] })
    },
  })

  const deleteItemMutation = useMutation({
    mutationFn: (id: string) => checklistApi.deleteTripItem(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["checklists", tripId] })
    },
  })

  const importTemplatesMutation = useMutation({
    mutationFn: (templateIds: string[]) => checklistApi.importTemplates(tripId, templateIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["checklists", tripId] })
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
