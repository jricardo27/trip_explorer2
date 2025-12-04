import { Box, List, ListItem, ListItemButton, ListItemText, Typography } from "@mui/material"
import React from "react"
import { useNavigate } from "react-router-dom"

const destinations = [
  {
    label: "Australia",
    children: [
      { path: "/australianCapitalTerritory", label: "Australian Capital Territory" },
      { path: "/newSouthWales", label: "New South Wales" },
      { path: "/northernTerritory", label: "Northern Territory" },
      { path: "/queensland", label: "Queensland" },
      { path: "/victoria", label: "Victoria" },
      { path: "/southAustralia", label: "South Australia" },
      { path: "/tasmania", label: "Tasmania" },
      { path: "/westernAustralia", label: "Western Australia" },
    ],
  },
  {
    label: "New Zealand",
    children: [{ path: "/newZealand", label: "New Zealand" }],
  },
]

interface DestinationsProps {
  drawerOpen?: boolean
  closeDrawer?: () => void
  isPinned?: boolean
  onTogglePin?: () => void
}

const Destinations: React.FC<DestinationsProps> = () => {
  const navigate = useNavigate()

  const handleDestinationClick = (path: string) => {
    localStorage.removeItem("mapState")
    navigate(path)
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Available Destinations
      </Typography>
      {destinations.map((region) => (
        <Box key={region.label} sx={{ mb: 4 }}>
          <Typography variant="h6" gutterBottom>
            {region.label}
          </Typography>
          <List disablePadding>
            {region.children.map((dest) => (
              <ListItem key={dest.path} disablePadding>
                <ListItemButton onClick={() => handleDestinationClick(dest.path)}>
                  <ListItemText primary={dest.label} />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </Box>
      ))}
    </Box>
  )
}

export default Destinations
