import {
  Public as PublicIcon,
  LocationCity as CityIcon,
  Flight as FlightIcon,
  Event as EventIcon,
} from "@mui/icons-material"
import { Box, Paper, Typography, Skeleton } from "@mui/material"

import { useLanguageStore } from "../stores/languageStore"

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
  activeView?: string
  onCardClick?: (view: "countries" | "cities" | "trips" | "activityTypes") => void
}

export const StatisticsCards = ({ stats, isLoading, activeView, onCardClick }: StatisticsCardsProps) => {
  const { t } = useLanguageStore()

  const cards = [
    {
      id: "countries",
      title: t("countriesVisited"),
      value: stats?.totalCountries || 0,
      icon: <PublicIcon sx={{ fontSize: 40 }} />,
      color: "#4CAF50",
    },
    {
      id: "cities",
      title: t("citiesExplored"),
      value: stats?.totalCities || 0,
      icon: <CityIcon sx={{ fontSize: 40 }} />,
      color: "#2196F3",
    },
    {
      id: "trips",
      title: t("totalTrips"),
      value: stats?.totalTrips || 0,
      icon: <FlightIcon sx={{ fontSize: 40 }} />,
      color: "#FF9800",
    },
    {
      id: "activityTypes",
      title: t("activityTypes"),
      value: stats?.totalActivities || 0,
      icon: <EventIcon sx={{ fontSize: 40 }} />,
      color: "#9C27B0",
    },
  ] as const

  return (
    <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", md: "repeat(4, 1fr)" }, gap: 3 }}>
      {cards.map((card) => (
        <Paper
          key={card.id}
          onClick={() => onCardClick?.(card.id)}
          sx={{
            p: 3,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            cursor: onCardClick ? "pointer" : "default",
            background:
              activeView === card.id
                ? `linear-gradient(135deg, ${card.color}25 0%, ${card.color}15 100%)`
                : `linear-gradient(135deg, ${card.color}15 0%, ${card.color}05 100%)`,
            border: `1px solid ${activeView === card.id ? card.color : card.color + "30"}`,
            boxShadow: activeView === card.id ? `0 4px 12px ${card.color}40` : "none",
            transform: activeView === card.id ? "translateY(-4px)" : "none",
            transition: "all 0.2s ease-in-out",
            "&:hover": {
              transform: "translateY(-4px)",
              boxShadow: `0 8px 24px ${card.color}30`,
              background: `linear-gradient(135deg, ${card.color}20 0%, ${card.color}10 100%)`,
            },
          }}
        >
          <Box sx={{ color: card.color, mb: 1 }}>{card.icon}</Box>
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
