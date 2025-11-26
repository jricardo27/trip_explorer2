import { Box, List, ListItem, ListItemIcon, ListItemText, Typography } from "@mui/material"
import React from "react"
import { MdStarBorder } from "react-icons/md"

const Technical = (): React.ReactNode => {
  return (
    <Box p={2}>
      <Typography variant="body1">
        This app was written as a hobby project, it&#39;s a frontend app running entirely on your browser.
        <br />
        <br />
        All the information is stored in your browser and nothing leaves it unless you decide to export the data.
        <br />
        <br />
        The following are technical details for anyone interested:
      </Typography>
      <List>
        <ListItem>
          <ListItemIcon>
            <MdStarBorder />
          </ListItemIcon>
          <ListItemText primary="Vite 6 as build tool" />
        </ListItem>
        <ListItem>
          <ListItemIcon>
            <MdStarBorder />
          </ListItemIcon>
          <ListItemText primary="React 18 as base library" />
        </ListItem>
        <ListItem>
          <ListItemIcon>
            <MdStarBorder />
          </ListItemIcon>
          <ListItemText primary="Typescript 5 as base language" />
        </ListItem>
        <ListItem>
          <ListItemIcon>
            <MdStarBorder />
          </ListItemIcon>
          <ListItemText primary="Material Design as UI framework" />
        </ListItem>
        <ListItem>
          <ListItemIcon>
            <MdStarBorder />
          </ListItemIcon>
          <ListItemText primary="Leaftlet as map library" />
        </ListItem>
      </List>
    </Box>
  )
}

export default Technical
