import { Box, CircularProgress, Typography } from "@mui/material"
import L from "leaflet"
import { useEffect, useMemo } from "react"
import { GeoJSON, MapContainer, TileLayer, useMap } from "react-leaflet"
import "leaflet/dist/leaflet.css"

import type { HighlightsData } from "../hooks/useHighlights"

interface HighlightsMapProps {
  data?: HighlightsData
  isLoading?: boolean
}

const MapUpdater = ({ countries }: { countries: any[] }) => {
  const map = useMap()

  useEffect(() => {
    if (countries && countries.length > 0) {
      // Calculate bounds from all countries
      const bounds = L.latLngBounds([])
      countries.forEach((visit) => {
        if (visit.country.centroid) {
          bounds.extend([visit.country.centroid.lat, visit.country.centroid.lng])
        }
      })
      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [50, 50] })
      }
    }
  }, [countries, map])

  return null
}

export const HighlightsMap = ({ data, isLoading }: HighlightsMapProps) => {
  const countries = data?.countries
  const cities = data?.cities

  const countriesGeoJSON = useMemo(() => {
    if (!countries) return null

    return {
      type: "FeatureCollection",
      features: countries.map((visit) => ({
        type: "Feature",
        properties: {
          name: visit.country.name,
          code: visit.country.code,
          visitCount: visit.visitCount,
          activityCount: visit.activityCount,
        },
        geometry: visit.country.boundary,
      })),
    }
  }, [countries])

  const citiesGeoJSON = useMemo(() => {
    if (!cities) return null

    return {
      type: "FeatureCollection",
      features: cities
        .filter((visit) => visit.city.boundary)
        .map((visit) => ({
          type: "Feature",
          properties: {
            name: visit.city.name,
            countryCode: visit.city.countryCode,
            visitCount: visit.visitCount,
            activityCount: visit.activityCount,
            population: visit.city.population,
          },
          geometry: visit.city.boundary,
        })),
    }
  }, [cities])

  if (isLoading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100%" }}>
        <CircularProgress />
      </Box>
    )
  }

  if (!data || data.countries.length === 0) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100%", p: 4 }}>
        <Typography variant="h6" color="text.secondary">
          No travel data yet. Start creating trips to see your highlights!
        </Typography>
      </Box>
    )
  }

  return (
    <MapContainer
      center={[20, 0]}
      zoom={2}
      style={{ height: "100%", width: "100%" }}
      scrollWheelZoom={true}
      zoomControl={true}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />

      {countriesGeoJSON && (
        <GeoJSON
          data={countriesGeoJSON as any}
          style={() => ({
            fillColor: "#4CAF50",
            fillOpacity: 0.3,
            color: "#2E7D32",
            weight: 2,
          })}
          onEachFeature={(feature, layer) => {
            layer.bindPopup(
              `<strong>${feature.properties.name}</strong><br/>` +
                `Activities: ${feature.properties.activityCount}<br/>` +
                `Visits: ${feature.properties.visitCount}`,
            )
          }}
        />
      )}

      {citiesGeoJSON && (
        <GeoJSON
          data={citiesGeoJSON as any}
          style={() => ({
            fillColor: "#2196F3",
            fillOpacity: 0.4,
            color: "#1565C0",
            weight: 1,
          })}
          onEachFeature={(feature, layer) => {
            layer.bindPopup(
              `<strong>${feature.properties.name}</strong><br/>` +
                `Activities: ${feature.properties.activityCount}<br/>` +
                `Population: ${feature.properties.population?.toLocaleString() || "N/A"}`,
            )
          }}
        />
      )}

      <MapUpdater countries={data.countries} />
    </MapContainer>
  )
}
