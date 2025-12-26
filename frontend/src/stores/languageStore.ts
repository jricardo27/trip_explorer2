import { create } from "zustand"
import { persist } from "zustand/middleware"

import { translations } from "../i18n/translations"
import type { Language, TranslationKey } from "../i18n/translations"

interface LanguageState {
  language: Language
  setLanguage: (language: Language) => void
  t: (key: TranslationKey) => string
}

export const useLanguageStore = create<LanguageState>()(
  persist(
    (set, get) => ({
      language: "en",
      setLanguage: (language: Language) => set({ language }),
      t: (key: TranslationKey) => {
        const { language } = get()
        const translation = translations[language][key]
        if (!translation) {
          console.warn(`[LanguageStore] Missing translation for key: "${key}" in language: "${language}"`)
          // In development, show the key clearly to identify missing translations
          return `[${key}]`
        }
        return translation
      },
    }),
    {
      name: "language-storage",
    },
  ),
)
