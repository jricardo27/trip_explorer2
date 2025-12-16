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
} from "../types"

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3001/api"

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

export default apiClient
