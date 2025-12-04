import React, { ReactNode } from "react"

import { ThemeContext } from "./themeContextDefinition"

type ThemeMode = "light" | "dark"

interface ThemeProviderProps {
  children: ReactNode
}

export const ThemeModeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  // Always force light mode
  const mode: ThemeMode = "light"
  const toggleTheme = () => {} // No-op

  return <ThemeContext.Provider value={{ mode, toggleTheme }}>{children}</ThemeContext.Provider>
}
