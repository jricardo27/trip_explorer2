import { Dialog, DialogTitle, DialogContent, Tabs, Tab, Box } from "@mui/material"
import React, { useState } from "react"

import About from "./About.tsx"
import NextSteps from "./NextSteps.tsx"
import Technical from "./Technical.tsx"
import Tutorial from "./Tutorial.tsx"

interface WelcomeModalProps {
  open: boolean
  onClose: () => void
}

const WelcomeModal = ({ open, onClose }: WelcomeModalProps) => {
  const [tabValue, setTabValue] = useState(0)

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue)
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>Welcome to Trip Explorer (by Ricardo Perez)</DialogTitle>
      <DialogContent>
        <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
          <Tabs value={tabValue} onChange={handleTabChange} variant="fullWidth">
            <Tab label="About" />
            <Tab label="Tutorial" />
            <Tab label="What's Next" />
            <Tab label="Technical Stuff" />
          </Tabs>
        </Box>
        {tabValue === 0 && <About />}
        {tabValue === 1 && <Tutorial />}
        {tabValue === 2 && <NextSteps />}
        {tabValue === 3 && <Technical />}
      </DialogContent>
    </Dialog>
  )
}

export default WelcomeModal
