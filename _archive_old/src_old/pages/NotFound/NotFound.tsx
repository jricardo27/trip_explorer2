import { Container, Typography, Button, Box } from "@mui/material"
import React from "react"
import { Link } from "react-router-dom"

import config from "../../config.ts"

import { Illustration } from "./Illustration"
import classes from "./NotFound.module.css"

const NotFound: React.FC = () => {
  return (
    <Container className={classes.root}>
      <Box className={classes.inner}>
        <Illustration className={classes.image} />
        <Box className={classes.content}>
          <Typography className={classes.title} variant="h1" component="h1">
            Nothing to see here
          </Typography>
          <Typography className={classes.description} variant="body1" color="text.secondary" align="center">
            Page you are trying to open does not exist. You may have mistyped the address, or the page has been moved to
            another URL.
            <br />
            If you think this is an error, contact support by creating an issue on our{" "}
            <a href={config.issue_manager_url} target="_blank" rel="noopener noreferrer">
              issue manager
            </a>
          </Typography>
          <Box sx={{ display: "flex", justifyContent: "center" }}>
            <Button component={Link} to="/" size="large" variant="contained">
              Take me back to home page
            </Button>
          </Box>
        </Box>
      </Box>
    </Container>
  )
}

export default NotFound
