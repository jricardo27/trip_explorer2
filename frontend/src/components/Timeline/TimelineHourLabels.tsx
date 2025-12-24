import { Box, Typography } from "@mui/material"

interface TimelineHourLabelsProps {
  hours: number[]
  hourHeight: number
  headerHeight: number
}

export const TimelineHourLabels = ({ hours, hourHeight, headerHeight }: TimelineHourLabelsProps) => {
  return (
    <Box
      sx={{
        width: "50px", // Fixed width for the ruler
        bgcolor: "background.paper",
        flexShrink: 0,
      }}
    >
      {/* Header Spacer */}
      <Box sx={{ height: headerHeight, borderBottom: "2px solid #e0e0e0" }} />

      {/* Hour Labels */}
      <Box sx={{ position: "relative", height: hourHeight * 24 }}>
        {hours.map((hour) => (
          <Box
            key={hour}
            sx={{
              position: "absolute",
              top: hour * hourHeight,
              left: 0,
              right: 0,
              height: hourHeight,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderTop: "1px solid #f0f0f0",
            }}
          >
            <Typography variant="caption" color="text.secondary" fontWeight="medium">
              {hour.toString().padStart(2, "0")}:00
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>
  )
}
