import {
  Public as PublicIcon,
  LocationCity as CityIcon,
  Flight as FlightIcon,
  Event as EventIcon,
} from "@mui/icons-material"
import { Box, Paper, Typography, Skeleton } from "@mui/material"

interface StatisticsCardsProps {
  stats?: {
    totalTrips: number
    totalActivities: number
    totalCountries: number
    totalCities: number
    firstTripDate: string | null
    lastTripDate: string | null
  }
  isLoading?: boolean
}

export const StatisticsCards = ({ stats, isLoading }: StatisticsCardsProps) => {
  const cards = [
    {
      title: "Countries Visited",
      value: stats?.totalCountries || 0,
      icon: <PublicIcon sx={{ fontSize: 40 }} />,
      color: "#4CAF50",
    },
    {
      title: "Cities Explored",
      value: stats?.totalCities || 0,
      icon: <CityIcon sx={{ fontSize: 40 }} />,
      color: "#2196F3",
    },
    {
      title: "Total Trips",
      value: stats?.totalTrips || 0,
      icon: <FlightIcon sx={{ fontSize: 40 }} />,
      color: "#FF9800",
    },
    {
      title: "Activities",
      value: stats?.totalActivities || 0,
      icon: <EventIcon sx={{ fontSize: 40 }} />,
      color: "#9C27B0",
    },
  ]

  return (
    <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", md: "repeat(4, 1fr)" }, gap: 3 }}>
      {cards.map((card, index) => (
        <Paper
          key={index}
          sx={{
            p: 3,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            background: `linear-gradient(135deg, ${card.color}15 0%, ${card.color}05 100%)`,
            border: `1px solid ${card.color}30`,
            transition: "transform 0.2s, box-shadow 0.2s",
            "&:hover": {
              transform: "translateY(-4px)",
              boxShadow: `0 8px 24px ${card.color}30`,
            },
          }}
        >
          <Box sx={{ color: card.color, mb: 2 }}>{card.icon}</Box>
          {isLoading ? (
            <>
              <Skeleton width={80} height={40} />
              <Skeleton width={120} />
            </>
          ) : (
            <>
              <Typography variant="h3" sx={{ fontWeight: "bold", color: card.color }}>
                {card.value}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                {card.title}
              </Typography>
            </>
          )}
        </Paper>
      ))}
    </Box>
  )
}
