import {
  Box,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Typography,
  Tabs,
  Tab,
} from "@mui/material"
import React, { useMemo } from "react"
import { MdDelete } from "react-icons/md"

import { Trip } from "../../../contexts/TripContext"

interface TripListViewProps {
  trips: Trip[]
  tripFilter: "all" | "current" | "past" | "future"
  onTripFilterChange: (filter: "all" | "current" | "past" | "future") => void
  onTripSelect: (tripId: string) => void
  onTripDelete: (tripId: string) => void
  onCreateTrip: () => void
}

export const TripListView: React.FC<TripListViewProps> = ({
  trips,
  tripFilter,
  onTripFilterChange,
  onTripSelect,
  onTripDelete,
  onCreateTrip,
}) => {
  const filteredTrips = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    return trips.filter((trip) => {
      const startDate = new Date(trip.start_date)
      const endDate = new Date(trip.end_date)
      startDate.setHours(0, 0, 0, 0)
      endDate.setHours(0, 0, 0, 0)

      switch (tripFilter) {
        case "all":
          return true
        case "current":
          return startDate <= today && endDate >= today
        case "past":
          return endDate < today
        case "future":
          return startDate > today
        default:
          return true
      }
    })
  }, [trips, tripFilter])

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <Box sx={{ borderBottom: 1, borderColor: "divider", px: 2, pt: 1 }}>
        <Tabs value={tripFilter} onChange={(_, newValue) => onTripFilterChange(newValue)} variant="standard">
          <Tab label="ALL" value="all" />
          <Tab label="Current" value="current" />
          <Tab label="Past" value="past" />
          <Tab label="Future" value="future" />
        </Tabs>
      </Box>
      <Box sx={{ flexGrow: 1, overflowY: "auto", p: 2 }}>
        <Button fullWidth variant="contained" onClick={onCreateTrip} sx={{ mb: 2 }}>
          Create New Trip
        </Button>
        <List>
          {filteredTrips.map((trip) => (
            <ListItem key={trip.id} disablePadding sx={{ border: 1, borderColor: "divider", borderRadius: 1, mb: 1 }}>
              <Box
                sx={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  p: 1,
                  cursor: "pointer",
                  "&:hover": { bgcolor: "action.hover" },
                }}
                onClick={() => onTripSelect(trip.id)}
              >
                <ListItemText
                  primary={trip.name}
                  secondary={`${new Date(trip.start_date).toLocaleDateString()} - ${new Date(trip.end_date).toLocaleDateString()}`}
                />
                <ListItemSecondaryAction>
                  <IconButton
                    edge="end"
                    onClick={(e) => {
                      e.stopPropagation()
                      onTripDelete(trip.id)
                    }}
                  >
                    <MdDelete />
                  </IconButton>
                </ListItemSecondaryAction>
              </Box>
            </ListItem>
          ))}
        </List>
        {filteredTrips.length === 0 && (
          <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 4 }}>
            {tripFilter === "all" ? "No trips found. Create one to get started!" : `No ${tripFilter} trips found.`}
          </Typography>
        )}
      </Box>
    </Box>
  )
}
