import { Box, Link, List, ListItem, ListItemIcon, ListItemText, Typography } from "@mui/material"
import React from "react"
import { MdStarBorder } from "react-icons/md"

const NextSteps = (): React.ReactNode => {
  return (
    <Box p={2}>
      <Typography variant="body1">
        There are a number of features that could improve the experience using the app:
      </Typography>
      <List>
        <ListItem>
          <ListItemIcon>
            <MdStarBorder />
          </ListItemIcon>
          <ListItemText primary="Calculate driving/walking distances between POIs" />
        </ListItem>
        <ListItem>
          <ListItemIcon>
            <MdStarBorder />
          </ListItemIcon>
          <ListItemText primary="Enable searching on curated information" />
        </ListItem>
        <ListItem>
          <ListItemIcon>
            <MdStarBorder />
          </ListItemIcon>
          <ListItemText primary="Allow searching for locations not in the curated information" />
        </ListItem>
        <ListItem>
          <ListItemIcon>
            <MdStarBorder />
          </ListItemIcon>
          <ListItemText primary="Allow to create projects to keep different sets of POIs" />
        </ListItem>
        <ListItem>
          <ListItemIcon>
            <MdStarBorder />
          </ListItemIcon>
          <ListItemText primary="Improve experience on mobile devices" />
        </ListItem>
      </List>

      <Typography variant="body1">
        If you have any suggestions or feedback, please let me know by creating an issue using the{" "}
        <Link href="https://github.com/jricardo27/trip_explorer/issues" target="_blank" rel="noopener">
          issue tracker
        </Link>
      </Typography>
    </Box>
  )
}

export default NextSteps
