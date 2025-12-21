import { Container, Paper, TextField, Button, Typography, Box, Alert } from "@mui/material"
import { useState } from "react"
import { useNavigate, Link } from "react-router-dom"

import client from "../api/client"
import { useAuthStore } from "../stores/authStore"

const LoginPage = () => {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const navigate = useNavigate()
  const setAuth = useAuthStore((state) => state.setAuth)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const response = await client.post("/auth/login", { email, password })
      const { token, user } = response.data
      setAuth(token, user)
      navigate("/")
    } catch (err: any) {
      const errorData = err.response?.data?.error
      setError(typeof errorData === "string" ? errorData : errorData?.message || "Failed to login")
    }
  }

  return (
    <Container maxWidth="xs">
      <Box sx={{ mt: 8, display: "flex", flexDirection: "column", alignItems: "center" }}>
        <Paper elevation={3} sx={{ p: 4, width: "100%", borderRadius: 2 }}>
          <Box sx={{ mb: 3, textAlign: "center" }}>
            <Typography variant="h4" component="h1" fontWeight="bold" color="primary">
              Trip Explorer
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Plan your next adventure with ease
            </Typography>
          </Box>
          <Typography component="h2" variant="h5" align="center" gutterBottom>
            Sign In
          </Typography>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          <form onSubmit={handleSubmit}>
            <TextField
              margin="normal"
              required
              fullWidth
              label="Email Address"
              autoComplete="email"
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              label="Password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <Button type="submit" fullWidth variant="contained" sx={{ mt: 3, mb: 2 }}>
              Sign In
            </Button>
            <Box textAlign="center">
              <Link to="/signup" style={{ textDecoration: "none" }}>
                <Typography variant="body2" color="primary">
                  Don&apos;t have an account? Sign Up
                </Typography>
              </Link>
            </Box>
          </form>
        </Paper>
      </Box>
    </Container>
  )
}

export default LoginPage
