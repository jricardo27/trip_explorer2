import { create } from 'zustand'

interface AppState {
    userId: string | null
    setUserId: (userId: string) => void
    currentTripId: string | null
    setCurrentTripId: (tripId: string | null) => void
}

export const useAppStore = create<AppState>((set) => ({
    userId: '123e4567-e89b-12d3-a456-426614174000', // Temporary hardcoded user
    setUserId: (userId) => set({ userId }),
    currentTripId: null,
    setCurrentTripId: (tripId) => set({ currentTripId: tripId })
}))
