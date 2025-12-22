import { Box, CircularProgress, Typography } from "@mui/material"
import L from "leaflet"
import { useEffect, useMemo } from "react"
import { GeoJSON, MapContainer, TileLayer, useMap } from "react-leaflet"
import "leaflet/dist/leaflet.css"

import type { HighlightsData } from "../hooks/useHighlights"
import { useLanguageStore } from "../stores/languageStore"

interface HighlightsMapProps {
  data?: HighlightsData
  isLoading?: boolean
  highlightedId?: string | null
}

const ACTIVITY_COLORS: Record<string, string> = {
  ACCOMMODATION: "#E91E63",
  RESTAURANT: "#FF9800",
  ATTRACTION: "#9C27B0",
  TRANSPORT: "#2196F3",
  FLIGHT: "#03A9F4",
  ACTIVITY: "#4CAF50",
  TOUR: "#8BC34A",
  EVENT: "#FFC107",
  LOCATION: "#795548",
  CUSTOM: "#607D8B",
}

const MapUpdater = ({
  countries,
  cities,
  activities,
  highlightedId,
}: {
  countries?: any[]
  cities?: any[]
  activities?: any[]
  highlightedId?: string | null
}) => {
  const map = useMap()

  useEffect(() => {
    if (highlightedId) {
      // Try to zoom to highlighted city
      const city = cities?.find((v) => v.city.name === highlightedId)
      if (city) {
        map.flyTo([city.city.latitude, city.city.longitude], 12)
        return
      }

      // Try to zoom to highlighted country
      const country = countries?.find((v) => v.country.code === highlightedId)
      if (country && country.country.centroid) {
        map.flyTo([country.country.centroid.lat, country.country.centroid.lng], 5)
        return
      }

      // Try to zoom to highlighted activity
      const activity = activities?.find((a) => a.id === highlightedId || a.name === highlightedId)
      if (activity) {
        map.flyTo([activity.latitude, activity.longitude], 15)
        return
      }
    }

    if (countries && countries.length > 0 && !highlightedId) {
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
  }, [countries, cities, activities, highlightedId, map])

  return null
}

export const HighlightsMap = ({ data, isLoading, highlightedId }: HighlightsMapProps) => {
  const { t } = useLanguageStore()
  const countries = data?.countries
  const cities = data?.cities
  const activities = data?.activities

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
        .filter((visit) => visit.city.boundary || (visit.city.latitude && visit.city.longitude))
        .map((visit) => {
          if (visit.city.boundary) {
            return {
              type: "Feature",
              properties: {
                name: visit.city.name,
                countryCode: visit.city.countryCode,
                visitCount: visit.visitCount,
                activityCount: visit.activityCount,
                population: visit.city.population,
              },
              geometry: visit.city.boundary,
            }
          } else {
            // Fallback to point if no boundary
            return {
              type: "Feature",
              properties: {
                name: visit.city.name,
                countryCode: visit.city.countryCode,
                visitCount: visit.visitCount,
                activityCount: visit.activityCount,
                population: visit.city.population,
              },
              geometry: {
                type: "Point",
                coordinates: [visit.city.longitude, visit.city.latitude],
              },
            }
          }
        }),
    }
  }, [cities])

  const activitiesGeoJSON = useMemo(() => {
    if (!activities) return null

    return {
      type: "FeatureCollection",
      features: activities.map((a) => {
        const isHighlighted =
          !highlightedId ||
          a.id === highlightedId ||
          a.name === highlightedId ||
          a.city === highlightedId ||
          a.countryCode === highlightedId ||
          a.tripId === highlightedId ||
          a.activityType === highlightedId

        return {
          type: "Feature",
          properties: {
            id: a.id,
            name: a.name,
            type: a.activityType,
            date: a.scheduledStart ? new Date(a.scheduledStart).toLocaleDateString() : "",
            isHighlighted,
          },
          geometry: {
            type: "Point",
            coordinates: [a.longitude, a.latitude],
          },
        }
      }),
    }
  }, [activities, highlightedId])

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
          {t("noTravelData")}
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
          style={(feature: any) => ({
            fillColor: feature.properties.code === highlightedId ? "#FF9800" : "#4CAF50",
            fillOpacity: feature.properties.code === highlightedId ? 0.6 : 0.1,
            color: feature.properties.code === highlightedId ? "#E65100" : "#2E7D32",
            weight: feature.properties.code === highlightedId ? 3 : 1,
          })}
          onEachFeature={(feature, layer) => {
            layer.bindPopup(
              `<strong>${feature.properties.name}</strong><br/>` +
                `${t("activities")}: ${feature.properties.activityCount}<br/>` +
                `${t("trips")}: ${feature.properties.visitCount}`,
            )
          }}
        />
      )}

      {citiesGeoJSON && (
        <GeoJSON
          data={citiesGeoJSON as any}
          pointToLayer={(feature, latlng) => {
            return L.circleMarker(latlng, {
              radius: feature.properties.name === highlightedId ? 10 : 6,
              fillColor: feature.properties.name === highlightedId ? "#FF9800" : "#2196F3",
              color: "#fff",
              weight: 2,
              opacity: 1,
              fillOpacity: 0.8,
            })
          }}
          style={(feature: any) => ({
            fillColor: feature.properties.name === highlightedId ? "#FF9800" : "#2196F3",
            fillOpacity: feature.properties.name === highlightedId ? 0.7 : 0.2,
            color: feature.properties.name === highlightedId ? "#E65100" : "#1565C0",
            weight: feature.properties.name === highlightedId ? 3 : 1,
          })}
          onEachFeature={(feature, layer) => {
            layer.bindPopup(
              `<strong>${feature.properties.name}</strong><br/>` +
                `${t("activities")}: ${feature.properties.activityCount}<br/>` +
                (feature.properties.population
                  ? `${t("population")}: ${feature.properties.population.toLocaleString()}`
                  : ""),
            )
          }}
        />
      )}

      {activitiesGeoJSON && (
        <GeoJSON
          data={activitiesGeoJSON as any}
          pointToLayer={(feature, latlng) => {
            const color = ACTIVITY_COLORS[feature.properties.type] || "#000"
            const isHighlighted = feature.properties.isHighlighted
            return L.circleMarker(latlng, {
              radius: isHighlighted ? 8 : 4,
              fillColor: color,
              color: "#fff",
              weight: isHighlighted ? 2 : 1,
              opacity: 1,
              fillOpacity: isHighlighted ? 0.9 : 0.4,
            })
          }}
          onEachFeature={(feature, layer) => {
            layer.bindPopup(
              `<strong>${feature.properties.name}</strong><br/>` +
                `${t("type")}: ${t(feature.properties.type as any)}<br/>` +
                `${feature.properties.date}`,
            )
          }}
        />
      )}

      <MapUpdater
        countries={data.countries}
        cities={data.cities}
        activities={data.activities}
        highlightedId={highlightedId}
      />
    </MapContainer>
  )
}
