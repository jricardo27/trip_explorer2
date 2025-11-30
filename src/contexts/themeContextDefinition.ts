import { createContext } from "react"

type ThemeMode = "light" | "dark"

export interface ThemeContextType {
  mode: ThemeMode
  toggleTheme: () => void
}

export const ThemeContext = createContext<ThemeContextType | undefined>(undefined)
