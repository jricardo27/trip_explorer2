import { ArrowBack } from "@mui/icons-material"
import { Box, Typography, Paper, FormControl, InputLabel, Select, MenuItem, Grid, Button } from "@mui/material"
import { useNavigate } from "react-router-dom"

import { useSettingsStore } from "../stores/settingsStore"

const SettingsPage = () => {
  const { dateFormat, currency, setDateFormat, setCurrency } = useSettingsStore()
  const navigate = useNavigate()

  const locales = [
    { code: "en-AU", label: "Australia (DD/MM/YYYY)" },
    { code: "en-US", label: "United States (MM/DD/YYYY)" },
    { code: "en-GB", label: "United Kingdom (DD/MM/YYYY)" },
    { code: "ja-JP", label: "Japan (YYYY/MM/DD)" },
  ]

  const currencies = [
    { code: "AUD", label: "Australian Dollar ($)" },
    { code: "USD", label: "US Dollar ($)" },
    { code: "EUR", label: "Euro (€)" },
    { code: "GBP", label: "British Pound (£)" },
    { code: "JPY", label: "Japanese Yen (¥)" },
  ]

  return (
    <Box maxWidth="md" mx="auto" mt={4}>
      <Button startIcon={<ArrowBack />} onClick={() => navigate(-1)} sx={{ mb: 2 }}>
        Back
      </Button>
      <Paper sx={{ p: 4 }}>
        <Typography variant="h4" gutterBottom>
          Settings
        </Typography>
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 6 }}>
            <FormControl fullWidth>
              <InputLabel>Date Format (Region)</InputLabel>
              <Select value={dateFormat} label="Date Format (Region)" onChange={(e) => setDateFormat(e.target.value)}>
                {locales.map((locale) => (
                  <MenuItem key={locale.code} value={locale.code}>
                    {locale.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <FormControl fullWidth>
              <InputLabel>Default Currency</InputLabel>
              <Select value={currency} label="Default Currency" onChange={(e) => setCurrency(e.target.value)}>
                {currencies.map((curr) => (
                  <MenuItem key={curr.code} value={curr.code}>
                    {curr.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>
    </Box>
  )
}

export default SettingsPage
