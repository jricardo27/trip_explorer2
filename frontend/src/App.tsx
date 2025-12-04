import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material'
import TripList from './pages/TripList'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000 // 5 minutes
    }
  }
})

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2'
    },
    secondary: {
      main: '#dc004e'
    }
  }
})

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <TripList />
        <ReactQueryDevtools initialIsOpen={false} />
      </ThemeProvider>
    </QueryClientProvider>
  )
}

export default App
