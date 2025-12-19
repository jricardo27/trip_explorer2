import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"

import client from "../api/client"
import type { Expense } from "../types"

export interface CreateExpenseRequest {
  tripId: string
  description: string
  category: string
  amount: number
  currency: string
  paidById?: string
  date?: string
  notes?: string
  isPaid?: boolean
  splitType?: string
  splits?: { memberId: string; amount?: number }[]
}

export interface UpdateExpenseRequest extends Partial<Omit<CreateExpenseRequest, "tripId">> {
  id: string
}

export const useExpenses = (tripId: string) => {
  const queryClient = useQueryClient()

  const {
    data: expenses = [],
    isLoading,
    error,
  } = useQuery<Expense[]>({
    queryKey: ["expenses", tripId],
    queryFn: async () => {
      const response = await client.get(`/trips/${tripId}/expenses`)
      return response.data
    },
    enabled: !!tripId,
  })

  // Calculate totals
  const totalAmount = expenses.reduce((sum, exp) => sum + Number(exp.amount), 0) // Simple sum, ignoring currency for now or assuming base currency
  // Ideally we should convert currencies if handling multiple.

  const createExpense = useMutation({
    mutationFn: async (data: CreateExpenseRequest) => {
      const response = await client.post("/expenses", data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses", tripId] })
      queryClient.invalidateQueries({ queryKey: ["trips", tripId] }) // Update trip totals if displayed
    },
  })

  const deleteExpense = useMutation({
    mutationFn: async (id: string) => {
      await client.delete(`/expenses/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses", tripId] })
      queryClient.invalidateQueries({ queryKey: ["trips", tripId] })
    },
  })

  const updateExpense = useMutation({
    mutationFn: async ({ id, ...data }: UpdateExpenseRequest) => {
      const response = await client.patch(`/expenses/${id}`, data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses", tripId] })
      queryClient.invalidateQueries({ queryKey: ["trips", tripId] })
    },
  })

  return {
    expenses,
    totalAmount,
    isLoading,
    error,
    createExpense,
    deleteExpense,
    updateExpense,
  }
}
