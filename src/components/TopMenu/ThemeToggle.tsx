import { IconButton, Tooltip } from "@mui/material"
import { MdDarkMode, MdLightMode } from "react-icons/md"

import { useThemeMode } from "../../contexts/useThemeMode"

export const ThemeToggle = () => {
  const { mode, toggleTheme } = useThemeMode()

  return (
    <Tooltip title={mode === "light" ? "Switch to dark mode" : "Switch to light mode"}>
      <IconButton onClick={toggleTheme} color="inherit" sx={{ ml: 1 }}>
        {mode === "light" ? <MdDarkMode /> : <MdLightMode />}
      </IconButton>
    </Tooltip>
  )
}
