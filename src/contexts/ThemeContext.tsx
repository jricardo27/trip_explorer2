import React, { useState, useEffect, ReactNode } from "react"

import { ThemeContext } from "./themeContextDefinition"

type ThemeMode = "light" | "dark"

interface ThemeProviderProps {
  children: ReactNode
}

export const ThemeModeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [mode, setMode] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem("theme-mode")
    return (saved as ThemeMode) || "light"
  })

  useEffect(() => {
    localStorage.setItem("theme-mode", mode)
  }, [mode])

  const toggleTheme = () => {
    setMode((prev) => (prev === "light" ? "dark" : "light"))
  }

  return <ThemeContext.Provider value={{ mode, toggleTheme }}>{children}</ThemeContext.Provider>
}
