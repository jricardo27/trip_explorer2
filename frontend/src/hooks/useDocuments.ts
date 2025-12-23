import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"

import { documentApi } from "../api/client"
import type { TripDocument, CreateDocumentRequest } from "../types"

export const useDocuments = (tripId: string) => {
  const queryClient = useQueryClient()

  const { data: documents = [], isLoading } = useQuery<TripDocument[]>({
    queryKey: ["documents", tripId],
    queryFn: () => documentApi.list(tripId),
  })

  const createDocumentMutation = useMutation({
    mutationFn: (data: CreateDocumentRequest) => documentApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents", tripId] })
    },
  })

  const updateDocumentMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateDocumentRequest> }) => documentApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents", tripId] })
    },
  })

  const deleteDocumentMutation = useMutation({
    mutationFn: (id: string) => documentApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents", tripId] })
    },
  })

  return {
    documents,
    isLoading,
    createDocument: createDocumentMutation.mutateAsync,
    updateDocument: updateDocumentMutation.mutateAsync,
    deleteDocument: deleteDocumentMutation.mutateAsync,
    isProcessing:
      createDocumentMutation.isPending || updateDocumentMutation.isPending || deleteDocumentMutation.isPending,
  }
}
