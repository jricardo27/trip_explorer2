import { Box, Typography, Card, CardContent, Grid2 } from "@mui/material"
import React, { useMemo } from "react"
import { MdLocationOn, MdAccessTime, MdAttachMoney, MdRoute } from "react-icons/md"

import { DayLocation, TripFeature } from "../../contexts/TripContext"
import { calculateTotalDistance, formatDistance, formatTravelTime } from "../../utils/distanceUtils"

interface TripSummaryProps {
  dayLocations: Record<string, DayLocation[]>
  dayFeatures: Record<string, TripFeature[]>
}

export const TripSummary: React.FC<TripSummaryProps> = ({ dayLocations, dayFeatures }) => {
  const stats = useMemo(() => {
    // Combine all locations and features
    const allItems: Array<{
      latitude?: number
      longitude?: number
      geometry?: { coordinates: number[] }
      transport_cost?: number
      duration_minutes?: number
    }> = []

    // Add all locations
    Object.values(dayLocations).forEach((locations) => {
      allItems.push(...locations)
    })

    // Add all features
    Object.values(dayFeatures).forEach((features) => {
      allItems.push(...features)
    })

    // Calculate totals
    const totalDistance = calculateTotalDistance(allItems)
    const totalLocations = Object.values(dayLocations).reduce((sum, locs) => sum + locs.length, 0)
    const totalFeatures = Object.values(dayFeatures).reduce((sum, feats) => sum + feats.length, 0)

    const totalCost = allItems.reduce((sum, item) => sum + (item.transport_cost || 0), 0)

    const totalDuration = allItems.reduce((sum, item) => sum + (item.duration_minutes || 0), 0)

    return {
      distance: totalDistance,
      locations: totalLocations,
      features: totalFeatures,
      cost: totalCost,
      duration: totalDuration,
    }
  }, [dayLocations, dayFeatures])

  if (stats.locations === 0 && stats.features === 0) {
    return null
  }

  return (
    <Card sx={{ mb: 2 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Trip Summary
        </Typography>
        <Grid2 container spacing={2}>
          <Grid2 size={{ xs: 6, sm: 3 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <MdLocationOn color="primary" />
              <Box>
                <Typography variant="caption" color="text.secondary" display="block">
                  Items
                </Typography>
                <Typography variant="body2" fontWeight="bold">
                  {stats.locations + stats.features}
                </Typography>
              </Box>
            </Box>
          </Grid2>

          {stats.distance > 0 && (
            <Grid2 size={{ xs: 6, sm: 3 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <MdRoute color="primary" />
                <Box>
                  <Typography variant="caption" color="text.secondary" display="block">
                    Distance
                  </Typography>
                  <Typography variant="body2" fontWeight="bold">
                    {formatDistance(stats.distance)}
                  </Typography>
                </Box>
              </Box>
            </Grid2>
          )}

          {stats.duration > 0 && (
            <Grid2 size={{ xs: 6, sm: 3 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <MdAccessTime color="primary" />
                <Box>
                  <Typography variant="caption" color="text.secondary" display="block">
                    Duration
                  </Typography>
                  <Typography variant="body2" fontWeight="bold">
                    {formatTravelTime(stats.duration)}
                  </Typography>
                </Box>
              </Box>
            </Grid2>
          )}

          {stats.cost > 0 && (
            <Grid2 size={{ xs: 6, sm: 3 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <MdAttachMoney color="primary" />
                <Box>
                  <Typography variant="caption" color="text.secondary" display="block">
                    Cost
                  </Typography>
                  <Typography variant="body2" fontWeight="bold">
                    ${stats.cost.toFixed(2)}
                  </Typography>
                </Box>
              </Box>
            </Grid2>
          )}
        </Grid2>
      </CardContent>
    </Card>
  )
}
