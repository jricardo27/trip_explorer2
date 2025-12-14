import React from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { ReactQueryDevtools } from "@tanstack/react-query-devtools"
import { ThemeProvider, createTheme, CssBaseline } from "@mui/material"
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import TripList from "./pages/TripList"
import LoginPage from "./pages/LoginPage"
import SignupPage from "./pages/SignupPage"
import Layout from "./components/Layout"
import TripDetailsPage from "./pages/TripDetailsPage"
import SettingsPage from "./pages/SettingsPage"
import { useAuthStore } from "./stores/authStore"
import { useSettingsStore } from "./stores/settingsStore"
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider"
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs"
import "dayjs/locale/en-au"
import "dayjs/locale/en-gb"
import "dayjs/locale/ja"

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
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
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  return isAuthenticated() ? <>{children}</> : <Navigate to="/login" />
}

const App = () => {
  // ... CheckAuth ...
  const { dateFormat } = useSettingsStore()

  // Assuming 'isChecking' would be defined by the 'CheckAuth' logic.
  // For this change, we'll proceed without a specific 'isChecking' state
  // as it's not fully provided in the instruction's snippet.
  // If 'isChecking' were defined, it would look something like:
  // const [isChecking, setIsChecking] = React.useState(true);
  // React.useEffect(() => { /* async auth check */ setIsChecking(false); }, []);
  // if (isChecking) { return <div>Loading...</div> }

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <BrowserRouter>
          <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale={dateFormat.toLowerCase()}>
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
                <Route path="/settings" element={<SettingsPage />} />
              </Route>
            </Routes>
          </LocalizationProvider>
        </BrowserRouter>
        <ReactQueryDevtools initialIsOpen={false} />
      </ThemeProvider>
    </QueryClientProvider>
  )
}

export default App
