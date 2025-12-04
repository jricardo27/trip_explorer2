import { Box, Link, List, ListItem, ListItemIcon, ListItemText, Typography } from "@mui/material"
import React from "react"
import { MdStarBorder } from "react-icons/md"

const About = (): React.ReactNode => {
  const sources = [
    { name: "OpenStreetMap", url: "https://www.openstreetmap.org/" },
    { name: "Campermate", url: "https://campermate.com/" },
    { name: "Wiki Camps", url: "https://wikicamps.com.au/" },
    { name: "Big4 Holiday Parks", url: "https://www.big4.com.au" },
    { name: "Discovery Parks", url: "https://www.discoveryholidayparks.com.au" },
    { name: "BP Australia", url: "https://www.bp.com/en_au/australia/home/who-we-are/find-your-nearest-bp.html" },
    { name: "Fuel Watch", url: "https://www.fuelwatch.wa.gov.au/" },
    { name: "Explore Parks WA", url: "https://exploreparks.dbca.wa.gov.au/" },
    { name: "Western Australia Visitor Centre", url: "https://www.wavisitorcentre.com.au/" },
    { name: "Western Australia website", url: "https://www.westernaustralia.com/" },
    { name: "Australia Public Toilet Map", url: "https://toiletmap.gov.au/" },
  ]

  return (
    <Box p={2}>
      <Box sx={{ display: "flex", alignItems: "flex-start", gap: 0 }}>
        <Typography variant="body1" sx={{ overflow: "hidden" }}>
          <Box
            component="img"
            src="./docs/img/online_trip_explorer_qr.svg"
            alt="Trip Explorer QR Code"
            sx={{
              width: "100px",
              float: "right",
              marginRight: "0.2rem",
              marginBottom: "0.2rem",
              objectFit: "contain",
            }}
          />
          Trip Explorer is a simple application that enables users to select points of interest (POIs) from a curated
          list on a map and export them as a KML (Keyhole Markup Language) file.
        </Typography>
      </Box>

      <Typography variant="body1">
        This file can be imported into an offline map such as Organic Maps in case you are travelling to a remote area
        with no phone coverage.
      </Typography>

      <Typography variant="body1">
        <br />
        In addition to selecting POIs, the application allows users to sort and categorize them, making it easy to plan
        trips in advance using each category as a daily itinerary.
      </Typography>

      <Typography variant="body1">
        <br />
        Selected POIs are saved locally, and the application does not require a frontend or backend server, running
        entirely in the user&#39;s browser.
        <br />
        <br />
      </Typography>

      <Typography variant="h6">Technology</Typography>

      <Typography variant="body1">
        <br />
        Trip explorer is built using Typescript, React and Vite.
        <br />
        While the application can run on mobile devices, it is not yet optimized for mobile use.
      </Typography>

      <Typography variant="body1">
        <br />
        The map is powered by Leaflet and GeoJSON data is sourced from multiple providers, including:
      </Typography>

      <List>
        {sources.map(({ name, url }) => (
          <ListItem key={name} sx={{ paddingBottom: 0 }}>
            <ListItemIcon>
              <MdStarBorder />
            </ListItemIcon>
            <ListItemText
              sx={{ margin: 0 }}
              primary={
                <Typography variant="body1">
                  <Link href={url} target="_blank" rel="noopener noreferrer">
                    {name}
                  </Link>
                </Typography>
              }
            />
          </ListItem>
        ))}
      </List>
    </Box>
  )
}

export default About
