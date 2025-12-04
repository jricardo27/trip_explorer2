import { Box, Typography } from "@mui/material"
import React from "react"

interface TimeGridProps {
  pixelsPerMinute?: number
}

export const TimeGrid: React.FC<TimeGridProps> = ({ pixelsPerMinute = 2 }) => {
  const hours = Array.from({ length: 24 }, (_, i) => i)
  const hourHeight = 60 * pixelsPerMinute

  return (
    <Box
      sx={{
        position: "sticky",
        left: 0,
        zIndex: 10,
        bgcolor: "background.paper",
        borderRight: 1,
        borderColor: "divider",
        minWidth: 60,
      }}
    >
      {hours.map((hour) => (
        <Box
          key={hour}
          sx={{
            height: hourHeight,
            borderBottom: 1,
            borderColor: "divider",
            display: "flex",
            alignItems: "flex-start",
            px: 1,
            py: 0.5,
          }}
        >
          <Typography variant="caption" color="text.secondary">
            {hour.toString().padStart(2, "0")}:00
          </Typography>
        </Box>
      ))}
    </Box>
  )
}
