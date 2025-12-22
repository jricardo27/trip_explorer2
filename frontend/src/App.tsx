import { ThemeProvider, createTheme, CssBaseline } from "@mui/material"
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs"
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider"
import { GoogleOAuthProvider } from "@react-oauth/google"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { ReactQueryDevtools } from "@tanstack/react-query-devtools"
import React from "react"
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"

import Layout from "./components/Layout"
import { HighlightsPage } from "./pages/HighlightsPage"
import LoginPage from "./pages/LoginPage"
import SettingsPage from "./pages/SettingsPage"
import SignupPage from "./pages/SignupPage"
import TripDetailsPage from "./pages/TripDetailsPage"
import TripList from "./pages/TripList"
import { useAuthStore } from "./stores/authStore"
import { useSettingsStore } from "./stores/settingsStore"

import "dayjs/locale/en-au"
import "dayjs/locale/en-gb"
import "dayjs/locale/ja"

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000,
    },
  },
})

const theme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: "#1976d2",
    },
    secondary: {
      main: "#dc004e",
    },
  },
})

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated } = useAuthStore()
  return isAuthenticated() ? <>{children}</> : <Navigate to="/login" />
}

const App = () => {
  const { dateFormat } = useSettingsStore()
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || ""

  return (
    <GoogleOAuthProvider clientId={googleClientId}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <BrowserRouter>
            <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale={dateFormat?.toLowerCase() || "en-au"}>
              <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/signup" element={<SignupPage />} />
                <Route
                  element={
                    <ProtectedRoute>
                      <Layout />
                    </ProtectedRoute>
                  }
                >
                  <Route path="/" element={<TripList />} />
                  <Route path="/trips" element={<TripList />} />
                  <Route path="/trips/:tripId" element={<TripDetailsPage />} />
                  <Route path="/highlights" element={<HighlightsPage />} />
                  <Route path="/settings" element={<SettingsPage />} />
                </Route>
              </Routes>
            </LocalizationProvider>
          </BrowserRouter>
          <ReactQueryDevtools initialIsOpen={false} />
        </ThemeProvider>
      </QueryClientProvider>
    </GoogleOAuthProvider>
  )
}

export default App
