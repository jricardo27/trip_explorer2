import { create } from "zustand"
import { persist } from "zustand/middleware"

interface SettingsState {
  dateFormat: string
  currency: string
  setDateFormat: (format: string) => void
  setCurrency: (currency: string) => void
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      dateFormat: "en-AU",
      currency: "AUD",
      setDateFormat: (dateFormat) => set({ dateFormat }),
      setCurrency: (currency) => set({ currency }),
    }),
    {
      name: "settings-storage",
    },
  ),
)
