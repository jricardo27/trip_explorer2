import {
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Grid2 as Grid,
  Paper,
  Typography,
  Box,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Tab,
  Tabs,
  FormControlLabel,
  Switch,
  Tooltip,
} from "@mui/material"
import html2canvas from "html2canvas"
import jsPDF from "jspdf"
import L from "leaflet"
import "leaflet/dist/leaflet.css"
import icon from "leaflet/dist/images/marker-icon.png"
import iconShadow from "leaflet/dist/images/marker-shadow.png"
import React, { useEffect, useState } from "react"
import { MdClose, MdLocationCity, MdPublic, MdPlace, MdFlightTakeoff, MdDateRange, MdDownload } from "react-icons/md"
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet"

import { useTripContext, TravelStats } from "../../contexts/TripContext"

const DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
})

L.Marker.prototype.options.icon = DefaultIcon
const LOCATION_ICON_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="32" height="32">' +
  '<path fill="#ed6c02" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z' +
  'm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>' +
  "</svg>"
const FEATURE_ICON_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="32" height="32">' +
  '<path fill="#9c27b0" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z' +
  'm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>' +
  "</svg>"

// Component to update map bounds based on displayed places
const MapBoundsUpdater: React.FC<{ places: { lat: number; lng: number }[] }> = ({ places }) => {
  const map = useMap()

  useEffect(() => {
    if (places.length > 0) {
      const bounds = L.latLngBounds(places.map((p) => [p.lat, p.lng]))
      map.fitBounds(bounds, { padding: [50, 50] })
    }
  }, [places, map])

  return null
}

interface TravelReportModalProps {
  open: boolean
  onClose: () => void
}

export const TravelReportModal: React.FC<TravelReportModalProps> = ({ open, onClose }) => {
  const { fetchTravelStats } = useTripContext()
  const [stats, setStats] = useState<TravelStats | null>(null)
  const [selectedYear, setSelectedYear] = useState<string>("all")
  const [tabValue, setTabValue] = useState(0)
  const [showFeaturesOnMap, setShowFeaturesOnMap] = useState(false)
  const [isExporting, setIsExporting] = useState(false)

  useEffect(() => {
    const loadStats = async () => {
      const year = selectedYear === "all" || selectedYear === "future" ? selectedYear : parseInt(selectedYear)
      const data = await fetchTravelStats(year)
      setStats(data)
    }

    if (open) {
      loadStats()
    }
  }, [open, selectedYear, fetchTravelStats])

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue)
  }

  const handleExportPDF = async () => {
    const element = document.getElementById("travel-report-content")
    if (!element) return

    setIsExporting(true)
    try {
      const canvas = await html2canvas(element, {
        useCORS: true,
        scale: 2,
        logging: false,
        backgroundColor: "#ffffff",
      })

      const imgData = canvas.toDataURL("image/png")
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      })

      const imgWidth = 210
      const pageHeight = 297
      const imgHeight = (canvas.height * imgWidth) / canvas.width
      let heightLeft = imgHeight
      let position = 0

      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight)
      heightLeft -= pageHeight

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight
        pdf.addPage()
        pdf.addImage(imgData, "PNG", 0, -position, imgWidth, imgHeight) // Fix position for subsequent pages
        heightLeft -= pageHeight
      }

      pdf.save(`Travel_Report_${selectedYear}.pdf`)
    } catch (error) {
      console.error("Failed to export PDF:", error)
    } finally {
      setIsExporting(false)
    }
  }

  if (!stats) return null

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle
        component="div"
        sx={{ m: 0, p: 2, display: "flex", justifyContent: "space-between", alignItems: "center" }}
      >
        <Typography variant="h6">Travel Report</Typography>
        <Box>
          <Tooltip title="Export to PDF">
            <IconButton onClick={handleExportPDF} disabled={isExporting} sx={{ mr: 1 }}>
              <MdDownload />
            </IconButton>
          </Tooltip>
          <IconButton
            aria-label="close"
            onClick={onClose}
            sx={{
              color: (theme) => theme.palette.grey[500],
            }}
          >
            <MdClose />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent dividers>
        <div id="travel-report-content" style={{ padding: "16px" }}>
          <Box sx={{ mb: 3, display: "flex", justifyContent: "flex-end" }}>
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel id="year-select-label">Year</InputLabel>
              <Select
                labelId="year-select-label"
                value={selectedYear}
                label="Year"
                onChange={(e) => setSelectedYear(e.target.value)}
              >
                <MenuItem value="all">All past trips</MenuItem>
                <MenuItem value="future">All future trips</MenuItem>
                {stats.available_years.map((year) => (
                  <MenuItem key={year} value={year.toString()}>
                    {year}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>

          {/* Mini Global Map - Always Visible */}
          <Box sx={{ mb: 3, height: 300, width: "100%", position: "relative", borderRadius: 1, overflow: "hidden" }}>
            <Box
              sx={{
                position: "absolute",
                top: 10,
                right: 10,
                zIndex: 1000,
                bgcolor: "background.paper",
                p: 1,
                borderRadius: 1,
                boxShadow: 1,
              }}
            >
              <FormControlLabel
                control={
                  <Switch
                    checked={showFeaturesOnMap}
                    onChange={(e) => setShowFeaturesOnMap(e.target.checked)}
                    size="small"
                  />
                }
                label="Show Features"
              />
            </Box>
            <MapContainer center={[20, 0]} zoom={2} style={{ height: "100%", width: "100%" }} scrollWheelZoom={true}>
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <MapBoundsUpdater places={stats.places.filter((p) => showFeaturesOnMap || p.type === "location")} />
              {stats.places
                .filter((p) => showFeaturesOnMap || p.type === "location")
                .map((place, index) => {
                  const iconHtml = place.type === "location" ? LOCATION_ICON_SVG : FEATURE_ICON_SVG

                  const customIcon = L.divIcon({
                    html: iconHtml,
                    className: "custom-marker-icon",
                    iconSize: [32, 32],
                    iconAnchor: [16, 32],
                    popupAnchor: [0, -32],
                  })

                  return (
                    <Marker key={`${place.name}-${index}`} position={[place.lat, place.lng]} icon={customIcon}>
                      <Popup>
                        <Typography variant="subtitle2">{place.name}</Typography>
                        <Typography variant="caption">
                          {place.country} ({place.type})
                        </Typography>
                      </Popup>
                    </Marker>
                  )
                })}
            </MapContainer>
          </Box>

          <Grid container spacing={2} sx={{ mb: 4 }}>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <StatCard
                icon={<MdPublic size={32} color="#1976d2" />}
                label="Countries"
                value={stats.countries_count}
                onClick={() => setTabValue(0)}
                selected={tabValue === 0}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <StatCard
                icon={<MdLocationCity size={32} color="#2e7d32" />}
                label="Cities"
                value={stats.cities_count}
                onClick={() => setTabValue(1)}
                selected={tabValue === 1}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <StatCard
                icon={<MdPlace size={32} color="#ed6c02" />}
                label="Places Visited"
                value={stats.total_places}
                onClick={() => setTabValue(2)}
                selected={tabValue === 2}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 6 }}>
              <StatCard
                icon={<MdFlightTakeoff size={32} color="#9c27b0" />}
                label="Trips Taken"
                value={stats.total_trips}
                onClick={() => setTabValue(3)}
                selected={tabValue === 3}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 6 }}>
              <StatCard
                icon={<MdDateRange size={32} color="#d32f2f" />}
                label="Days Traveled"
                value={stats.total_days}
              />
            </Grid>
          </Grid>

          <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
            <Tabs value={tabValue} onChange={handleTabChange} aria-label="report tabs">
              <Tab label="Countries" />
              <Tab label="Cities" />
              <Tab label="Places Visited" />
              <Tab label="Trips" />
            </Tabs>
          </Box>

          <Box sx={{ mt: 2, maxHeight: 400, overflow: "auto" }}>
            {tabValue === 0 && (
              <List>
                {stats.countries.map((country, index) => (
                  <React.Fragment key={country.country_code}>
                    <ListItem>
                      <ListItemIcon>
                        <img
                          src={`https://flagcdn.com/24x18/${country.country_code.toLowerCase()}.png`}
                          alt={country.country}
                          style={{ borderRadius: 2 }}
                        />
                      </ListItemIcon>
                      <ListItemText primary={country.country} />
                    </ListItem>
                    {index < stats.countries.length - 1 && <Divider />}
                  </React.Fragment>
                ))}
              </List>
            )}
            {tabValue === 1 && (
              <List>
                {stats.cities.map((city, index) => (
                  <React.Fragment key={`${city.city}-${city.country}`}>
                    <ListItem>
                      <ListItemText primary={city.city} secondary={city.country} />
                    </ListItem>
                    {index < stats.cities.length - 1 && <Divider />}
                  </React.Fragment>
                ))}
              </List>
            )}
            {tabValue === 2 && (
              <List>
                {stats.places.map((place, index) => (
                  <React.Fragment key={`${place.name}-${index}`}>
                    <ListItem>
                      <ListItemIcon>
                        {place.type === "location" ? <MdPlace color="#ed6c02" /> : <MdPlace color="#9c27b0" />}
                      </ListItemIcon>
                      <ListItemText primary={place.name} secondary={`${place.country} (${place.type})`} />
                    </ListItem>
                    {index < stats.places.length - 1 && <Divider />}
                  </React.Fragment>
                ))}
              </List>
            )}
            {tabValue === 3 && (
              <List>
                {stats.trips.map((trip, index) => (
                  <React.Fragment key={trip.id}>
                    <ListItem alignItems="flex-start">
                      <ListItemIcon>
                        <MdFlightTakeoff color="#9c27b0" />
                      </ListItemIcon>
                      <ListItemText
                        primary={
                          <Typography variant="subtitle1" component="div">
                            {trip.name}
                          </Typography>
                        }
                        secondary={
                          <React.Fragment>
                            <Typography component="span" variant="body2" color="text.primary">
                              {new Date(trip.start_date).toLocaleDateString()} - {trip.duration_days} days
                            </Typography>
                            <br />
                            {trip.countries && trip.countries.length > 0 && (
                              <Typography component="span" variant="body2" display="block">
                                Countries: {trip.countries.join(", ")}
                              </Typography>
                            )}
                            {trip.cities && trip.cities.length > 0 && (
                              <Typography component="span" variant="body2" display="block">
                                Cities: {trip.cities.join(", ")}
                              </Typography>
                            )}
                          </React.Fragment>
                        }
                      />
                    </ListItem>
                    {index < stats.trips.length - 1 && <Divider variant="inset" component="li" />}
                  </React.Fragment>
                ))}
              </List>
            )}
          </Box>
        </div>
      </DialogContent>
    </Dialog>
  )
}

const StatCard: React.FC<{
  icon: React.ReactNode
  label: string
  value: number
  onClick?: () => void
  selected?: boolean
}> = ({ icon, label, value, onClick, selected }) => (
  <Paper
    sx={{
      p: 2,
      display: "flex",
      alignItems: "center",
      height: "100%",
      cursor: onClick ? "pointer" : "default",
      border: selected ? 2 : 0,
      borderColor: "primary.main",
      transition: "all 0.2s",
      "&:hover": {
        transform: onClick ? "translateY(-2px)" : "none",
        boxShadow: onClick ? 4 : 1,
      },
    }}
    elevation={selected ? 4 : 2}
    onClick={onClick}
  >
    <Box sx={{ mr: 2 }}>{icon}</Box>
    <Box>
      <Typography variant="h4" component="div">
        {value}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
    </Box>
  </Paper>
)
