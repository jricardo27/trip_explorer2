import { Box, ThemeProvider, CssBaseline } from "@mui/material"
import React, { useEffect, useState } from "react"
import ReactGA from "react-ga4"
import { HashRouter, Routes, Route, useNavigate, useLocation } from "react-router-dom"

import SavedFeaturesDrawer from "./components/SavedFeaturesDrawer/SavedFeaturesDrawer"
import TopMenu from "./components/TopMenu/TopMenu"
import WelcomeModal from "./components/WelcomeModal/WelcomeModal"
import config from "./config"
import { MapControlProvider, useMapControl } from "./contexts/MapControlContext"
import SavedFeaturesProvider from "./contexts/SavedFeaturesProvider"
import { ThemeModeProvider } from "./contexts/ThemeContext"
import { TripProvider } from "./contexts/TripContext"
import { useThemeMode } from "./contexts/useThemeMode"
import { AustralianCapitalTerritory } from "./pages/Australia/AustralianCapitalTerritory"
import { NewSouthWales } from "./pages/Australia/NewSouthWales"
import { NorthernTerritory } from "./pages/Australia/NorthernTerritory"
import { Queensland } from "./pages/Australia/Queensland"
import { SouthAustralia } from "./pages/Australia/SouthAustralia"
import { Tasmania } from "./pages/Australia/Tasmania"
import { Victoria } from "./pages/Australia/Victoria"
import { WesternAustralia } from "./pages/Australia/WesternAustralia"
import Destinations from "./pages/Destinations/Destinations"
import { NewZealand } from "./pages/NewZealand/NewZealand"
import NotFound from "./pages/NotFound/NotFound"
import { TripDetailPage } from "./pages/TripDetailPage"
import { lightTheme, darkTheme } from "./theme/theme"
import { ToastContainer } from "./utils/notifications"

const RedirectHandler = () => {
  const navigate = useNavigate()
  const location = useLocation()
  useEffect(() => {
    const referrer = sessionStorage.getItem("referrer")
    if (referrer) {
      sessionStorage.removeItem("referrer")

      // Check if we're on any valid route in the app
      if (location.pathname !== referrer) {
        navigate(referrer)
      }
    }
  }, [navigate, location])
  return null
}

function App(): React.ReactNode {
  const [welcomeDialogOpen, setWelcomeDialogOpen] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)

  useEffect(() => {
    // Initialize Google Analytics if measurement ID is provided
    if (config.ga.measurementId) {
      ReactGA.initialize(config.ga.measurementId)
    }
  }, [])

  useEffect(() => {
    const hasShownModal = localStorage.getItem("hasShownModal")
    if (!hasShownModal) {
      setWelcomeDialogOpen(true)
      // localStorage.setItem("hasShownModal", "true")
    }
  }, [])

  const [isPinned, setIsPinned] = useState(false)

  const handleClose = () => {
    setWelcomeDialogOpen(false)
  }

  const openDrawer = () => {
    setDrawerOpen(true)
  }

  const closeDrawer = () => {
    setDrawerOpen(false)
  }

  const togglePin = () => {
    setIsPinned(!isPinned)
  }

  return (
    <ThemeModeProvider>
      <ThemedApp
        welcomeDialogOpen={welcomeDialogOpen}
        handleClose={handleClose}
        drawerOpen={drawerOpen}
        openDrawer={openDrawer}
        closeDrawer={closeDrawer}
        isPinned={isPinned}
        togglePin={togglePin}
      />
    </ThemeModeProvider>
  )
}

interface ThemedAppProps {
  welcomeDialogOpen: boolean
  handleClose: () => void
  drawerOpen: boolean
  openDrawer: () => void
  closeDrawer: () => void
  isPinned: boolean
  togglePin: () => void
}

const ThemedApp: React.FC<ThemedAppProps> = ({
  welcomeDialogOpen,
  handleClose,
  drawerOpen,
  openDrawer,
  closeDrawer,
  isPinned,
  togglePin,
}) => {
  const { mode } = useThemeMode()
  const theme = mode === "light" ? lightTheme : darkTheme

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <HashRouter basename="">
        <MapControlProvider>
          <Box sx={{ display: "flex", flexDirection: "column", height: "100vh" }}>
            <RedirectHandler />
            <SavedFeaturesProvider>
              <TripProvider>
                <TopMenu onMenuClick={openDrawer} />
                <Box sx={{ flexGrow: 1, overflow: "hidden", position: "relative" }}>
                  <Routes>
                    <Route
                      path="/"
                      element={
                        <Destinations
                          drawerOpen={drawerOpen}
                          closeDrawer={closeDrawer}
                          isPinned={isPinned}
                          onTogglePin={togglePin}
                        />
                      }
                    />
                    <Route
                      path="/australianCapitalTerritory"
                      element={
                        <AustralianCapitalTerritory
                          drawerOpen={drawerOpen}
                          closeDrawer={closeDrawer}
                          isPinned={isPinned}
                          onTogglePin={togglePin}
                        />
                      }
                    />
                    <Route
                      path="/newSouthWales"
                      element={
                        <NewSouthWales
                          drawerOpen={drawerOpen}
                          closeDrawer={closeDrawer}
                          isPinned={isPinned}
                          onTogglePin={togglePin}
                        />
                      }
                    />
                    <Route
                      path="/northernTerritory"
                      element={
                        <NorthernTerritory
                          drawerOpen={drawerOpen}
                          closeDrawer={closeDrawer}
                          isPinned={isPinned}
                          onTogglePin={togglePin}
                        />
                      }
                    />
                    <Route
                      path="/queensland"
                      element={
                        <Queensland
                          drawerOpen={drawerOpen}
                          closeDrawer={closeDrawer}
                          isPinned={isPinned}
                          onTogglePin={togglePin}
                        />
                      }
                    />
                    <Route
                      path="/southAustralia"
                      element={
                        <SouthAustralia
                          drawerOpen={drawerOpen}
                          closeDrawer={closeDrawer}
                          isPinned={isPinned}
                          onTogglePin={togglePin}
                        />
                      }
                    />
                    <Route
                      path="/tasmania"
                      element={
                        <Tasmania
                          drawerOpen={drawerOpen}
                          closeDrawer={closeDrawer}
                          isPinned={isPinned}
                          onTogglePin={togglePin}
                        />
                      }
                    />
                    <Route
                      path="/victoria"
                      element={
                        <Victoria
                          drawerOpen={drawerOpen}
                          closeDrawer={closeDrawer}
                          isPinned={isPinned}
                          onTogglePin={togglePin}
                        />
                      }
                    />
                    <Route
                      path="/westernAustralia"
                      element={
                        <WesternAustralia
                          drawerOpen={drawerOpen}
                          closeDrawer={closeDrawer}
                          isPinned={isPinned}
                          onTogglePin={togglePin}
                        />
                      }
                    />
                    <Route
                      path="/newZealand"
                      element={
                        <NewZealand
                          drawerOpen={drawerOpen}
                          closeDrawer={closeDrawer}
                          isPinned={isPinned}
                          onTogglePin={togglePin}
                        />
                      }
                    />
                    <Route path="/trips/:tripId" element={<TripDetailPage />} />

                    <Route path="*" element={<NotFound />} />
                  </Routes>
                  <GlobalSavedFeaturesDrawer
                    drawerOpen={drawerOpen}
                    closeDrawer={closeDrawer}
                    isPinned={isPinned}
                    togglePin={togglePin}
                  />
                </Box>
              </TripProvider>
            </SavedFeaturesProvider>
          </Box>
          <ToastContainer />
          <WelcomeModal open={welcomeDialogOpen} onClose={handleClose} />
        </MapControlProvider>
      </HashRouter>
    </ThemeProvider>
  )
}

const GlobalSavedFeaturesDrawer: React.FC<{
  drawerOpen: boolean
  closeDrawer: () => void
  isPinned: boolean
  togglePin: () => void
}> = ({ drawerOpen, closeDrawer, isPinned, togglePin }) => {
  const { flyTo } = useMapControl()
  return (
    <SavedFeaturesDrawer
      drawerOpen={drawerOpen}
      onClose={closeDrawer}
      isPinned={isPinned}
      onTogglePin={togglePin}
      onFlyTo={flyTo}
    />
  )
}

export default App
