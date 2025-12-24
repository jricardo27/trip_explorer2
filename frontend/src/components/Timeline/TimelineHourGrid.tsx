import { Box } from "@mui/material"

interface TimelineHourGridProps {
  hours: number[]
  hourHeight: number
}

export const TimelineHourGrid = ({ hours, hourHeight }: TimelineHourGridProps) => {
  return (
    <Box sx={{ position: "relative", height: hourHeight * 24, minHeight: hourHeight * 24 }}>
      {hours.map((hour) => (
        <Box
          key={hour}
          sx={{
            position: "absolute",
            top: hour * hourHeight,
            left: 0,
            right: 0,
            height: hourHeight,
            borderTop: "1px solid #eeeeee", // Lighter lines for the grid
            pointerEvents: "none",
          }}
        />
      ))}
    </Box>
  )
}
