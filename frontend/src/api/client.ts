import axios from "axios"

import { useAuthStore } from "../stores/authStore"
import type {
  Trip,
  Activity,
  ApiResponse,
  CreateTripRequest,
  UpdateTripRequest,
  CreateActivityRequest,
  UpdateActivityRequest,
  TransportAlternative,
  CreateTransportRequest,
  ChecklistTemplate,
  TripChecklistItem,
  PackingListTemplate,
  TripPackingItem,
  TripDocument,
  CreateDocumentRequest,
  UpdateDocumentRequest,
} from "../types"

const API_BASE_URL = import.meta.env.VITE_API_URL || "/api"

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
})

// Add request interceptor
apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Trip API
export const tripApi = {
  list: async (filters?: { isCompleted?: boolean; startAfter?: string; endBefore?: string }): Promise<Trip[]> => {
    const params = new URLSearchParams()
    if (filters?.isCompleted !== undefined) {
      params.append("is_completed", String(filters.isCompleted))
    }
    if (filters?.startAfter) {
      params.append("start_after", filters.startAfter)
    }
    if (filters?.endBefore) {
      params.append("end_before", filters.endBefore)
    }

    const response = await apiClient.get<ApiResponse<Trip[]>>(`/trips?${params}`)
    return response.data.data
  },

  get: async (tripId: string): Promise<Trip> => {
    const response = await apiClient.get<ApiResponse<Trip>>(`/trips/${tripId}`)
    return response.data.data
  },

  create: async (data: Omit<CreateTripRequest, "userId">): Promise<Trip> => {
    const response = await apiClient.post<ApiResponse<Trip>>("/trips", data)
    return response.data.data
  },

  update: async (tripId: string, data: UpdateTripRequest): Promise<Trip> => {
    const response = await apiClient.put<ApiResponse<Trip>>(`/trips/${tripId}`, data)
    return response.data.data
  },

  delete: async (tripId: string): Promise<void> => {
    await apiClient.delete(`/trips/${tripId}`)
  },

  copy: async (tripId: string, name: string, startDate: string): Promise<Trip> => {
    const response = await apiClient.post<ApiResponse<Trip>>(`/trips/${tripId}/copy`, { name, startDate })
    return response.data.data
  },

  shift: async (tripId: string, days: number): Promise<Trip> => {
    const response = await apiClient.patch<ApiResponse<Trip>>(`/trips/${tripId}/shift`, { days })
    return response.data.data
  },

  updateCategories: async (
    tripId: string,
    data: { checklistCategories?: string[]; packingCategories?: string[] },
  ): Promise<Trip> => {
    const response = await apiClient.patch<ApiResponse<Trip>>(`/trips/${tripId}/categories`, data)
    return response.data.data
  },
}

// Activity API
export const activityApi = {
  list: async (
    tripId: string,
    filters?: {
      tripDayId?: string
      activityType?: string
      status?: string
    },
  ): Promise<Activity[]> => {
    const params = new URLSearchParams()
    if (filters?.tripDayId) {
      params.append("trip_day_id", filters.tripDayId)
    }
    if (filters?.activityType) {
      params.append("activity_type", filters.activityType)
    }
    if (filters?.status) {
      params.append("status", filters.status)
    }

    const queryString = params.toString()
    const url = `/trips/${tripId}/activities${queryString ? `?${queryString}` : ""}`
    const response = await apiClient.get<ApiResponse<Activity[]>>(url)
    return response.data.data
  },

  get: async (tripId: string, activityId: string): Promise<Activity> => {
    const response = await apiClient.get<ApiResponse<Activity>>(`/trips/${tripId}/activities/${activityId}`)
    return response.data.data
  },

  create: async (data: CreateActivityRequest): Promise<Activity> => {
    const response = await apiClient.post<ApiResponse<Activity>>(`/trips/${data.tripId}/activities`, data)
    return response.data.data
  },

  update: async (tripId: string, activityId: string, data: UpdateActivityRequest): Promise<Activity> => {
    const response = await apiClient.put<ApiResponse<Activity>>(`/trips/${tripId}/activities/${activityId}`, data)
    return response.data.data
  },

  delete: async (tripId: string, activityId: string): Promise<void> => {
    await apiClient.delete(`/trips/${tripId}/activities/${activityId}`)
  },

  getConflicts: async (tripId: string): Promise<any[]> => {
    const response = await apiClient.get<ApiResponse<any[]>>(`/trips/${tripId}/activities/conflicts`)
    return response.data.data
  },
}

// Transport API
export const transportApi = {
  list: async (tripId: string): Promise<TransportAlternative[]> => {
    const response = await apiClient.get<ApiResponse<TransportAlternative[]>>(`/transport?tripId=${tripId}`)
    return response.data.data
  },

  create: async (data: CreateTransportRequest): Promise<TransportAlternative> => {
    const response = await apiClient.post<ApiResponse<TransportAlternative>>("/transport", data)
    return response.data.data
  },

  update: async (id: string, data: Partial<CreateTransportRequest>): Promise<TransportAlternative> => {
    const response = await apiClient.put<ApiResponse<TransportAlternative>>(`/transport/${id}`, data)
    return response.data.data
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/transport/${id}`)
  },

  select: async (id: string): Promise<TransportAlternative> => {
    const response = await apiClient.put<ApiResponse<TransportAlternative>>(`/transport/${id}/select`, {})
    return response.data.data
  },
}

// Checklist API
export const checklistApi = {
  listTemplates: async (): Promise<ChecklistTemplate[]> => {
    const response = await apiClient.get<ChecklistTemplate[]>("/checklists/templates")
    return response.data
  },
  createTemplate: async (data: { task: string; category: string; priority?: number }): Promise<ChecklistTemplate> => {
    const response = await apiClient.post<ChecklistTemplate>("/checklists/templates", data)
    return response.data
  },
  deleteTemplate: async (id: string): Promise<void> => {
    await apiClient.delete(`/checklists/templates/${id}`)
  },
  listTripItems: async (tripId: string): Promise<TripChecklistItem[]> => {
    const response = await apiClient.get<TripChecklistItem[]>(`/checklists/trip/${tripId}`)
    return response.data
  },
  createTripItem: async (
    tripId: string,
    data: { task: string; category?: string; priority?: number },
  ): Promise<TripChecklistItem> => {
    const response = await apiClient.post<TripChecklistItem>(`/checklists/trip/${tripId}`, data)
    return response.data
  },
  updateTripItem: async (id: string, data: Partial<TripChecklistItem>): Promise<TripChecklistItem> => {
    const response = await apiClient.put<TripChecklistItem>(`/checklists/item/${id}`, data)
    return response.data
  },
  deleteTripItem: async (id: string): Promise<void> => {
    await apiClient.delete(`/checklists/item/${id}`)
  },
  importTemplates: async (tripId: string, templateIds: string[]): Promise<void> => {
    await apiClient.post(`/checklists/trip/${tripId}/import`, { templateIds })
  },
}

// Packing List API
export const packingApi = {
  listTemplates: async (): Promise<PackingListTemplate[]> => {
    const response = await apiClient.get<PackingListTemplate[]>("/packing/templates")
    return response.data
  },
  createTemplate: async (data: { item: string; category: string; priority?: number }): Promise<PackingListTemplate> => {
    const response = await apiClient.post<PackingListTemplate>("/packing/templates", data)
    return response.data
  },
  deleteTemplate: async (id: string): Promise<void> => {
    await apiClient.delete(`/packing/templates/${id}`)
  },
  listTripItems: async (tripId: string): Promise<TripPackingItem[]> => {
    const response = await apiClient.get<TripPackingItem[]>(`/packing/trip/${tripId}`)
    return response.data
  },
  createTripItem: async (
    tripId: string,
    data: { item: string; category?: string; quantity?: number; priority?: number },
  ): Promise<TripPackingItem> => {
    const response = await apiClient.post<TripPackingItem>(`/packing/trip/${tripId}`, data)
    return response.data
  },
  updateTripItem: async (id: string, data: Partial<TripPackingItem>): Promise<TripPackingItem> => {
    const response = await apiClient.put<TripPackingItem>(`/packing/item/${id}`, data)
    return response.data
  },
  deleteTripItem: async (id: string): Promise<void> => {
    await apiClient.delete(`/packing/item/${id}`)
  },
  importTemplates: async (tripId: string, templateIds: string[]): Promise<void> => {
    await apiClient.post(`/packing/trip/${tripId}/import`, { templateIds })
  },
}

// Document API
export const documentApi = {
  list: async (tripId: string): Promise<TripDocument[]> => {
    const response = await apiClient.get<ApiResponse<TripDocument[]>>(`/trips/documents/list?tripId=${tripId}`)
    return response.data.data
  },

  create: async (data: CreateDocumentRequest): Promise<TripDocument> => {
    const response = await apiClient.post<ApiResponse<TripDocument>>("/trips/documents", data)
    return response.data.data
  },

  update: async (id: string, data: UpdateDocumentRequest): Promise<TripDocument> => {
    const response = await apiClient.put<ApiResponse<TripDocument>>(`/trips/documents/${id}`, data)
    return response.data.data
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/trips/documents/${id}`)
  },
}

export default apiClient
