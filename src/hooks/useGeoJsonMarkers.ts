import axios from "axios"
import { LatLngBounds } from "leaflet"
import { useEffect, useState } from "react"

import { GeoJsonCollection, GeoJsonDataMap, GeoJsonFeature, GeoJsonProperties, TAny } from "../data/types"
import deepMerge from "../utils/deepmerge.ts"

const useGeoJsonMarkers = (filenames: string[], bounds?: LatLngBounds | null): GeoJsonDataMap => {
  const [geoJsonData, setGeoJsonData] = useState<GeoJsonDataMap>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      // If bounds is explicitly null, it means we are waiting for the map to initialize
      if (bounds === null) {
        return
      }

      setLoading(true)
      try {
        const params: Record<string, string | number> = {}

        const isProduction = import.meta.env.MODE === "production"
        if (!isProduction) {
          // Always reload the files when running in development
          params["t"] = Date.now()
        }

        // Add bounds to query params if available
        if (bounds) {
          params["min_lon"] = bounds.getWest()
          params["min_lat"] = bounds.getSouth()
          params["max_lon"] = bounds.getEast()
          params["max_lat"] = bounds.getNorth()
        }

        const promises = filenames.map(async (filename): Promise<[string, GeoJsonCollection]> => {
          // Remove leading slash if present for the query param
          const pathParam = filename.startsWith("/") ? filename : "/" + filename

          const response = await axios.get<GeoJsonCollection>("/api/markers", {
            params: {
              ...params,
              path: pathParam,
            },
          })

          if (typeof response.data == "string") {
            throw new Error(`Error requesting ${filename}, ensure that the path is valid.`)
          }

          return [filename, response.data]
        })

        const results = await Promise.all(promises)
        const dataMap: GeoJsonDataMap = results.reduce(
          (acc: Record<string, GeoJsonCollection>, [filename, featureCollection]) => {
            const sharedProperties: GeoJsonProperties = featureCollection.properties || {}

            featureCollection.features.forEach((feature: GeoJsonFeature) => {
              if (feature.type !== "Feature") {
                console.warn("Skipping non-feature item in features array")
                return
              }

              // Merge top-level properties
              feature.properties = {
                ...sharedProperties,
                ...feature.properties,
              }

              // Handle nested properties
              Object.keys(sharedProperties).forEach((key) => {
                if (typeof sharedProperties[key] === "object" && sharedProperties[key] !== null) {
                  const sourceProp = feature.properties?.[key]
                  if (typeof sourceProp === "object" && sourceProp !== null) {
                    feature.properties![key] = deepMerge(
                      sharedProperties[key] as Record<string, TAny>,
                      sourceProp as Record<string, TAny>,
                    )
                  } else {
                    // If sourceProp is not an object or is null, just assign sharedProperties value
                    feature.properties![key] = sharedProperties[key]
                  }
                }
              })
            })

            acc[filename] = featureCollection
            return acc
          },
          {},
        )
        setGeoJsonData(dataMap)
      } catch (err: unknown) {
        console.error(err)

        if (err instanceof Error) {
          setError(err.message)
        }
      } finally {
        setLoading(false)
      }
    }

    // Debounce the fetch if bounds are changing rapidly
    const timeoutId = setTimeout(() => {
      fetchData()
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [filenames, bounds]) // Re-fetch when filenames or bounds change

  if (loading) {
    return { ...geoJsonData, loading: true } as GeoJsonDataMap & { loading: true } // Return the current data and loading state
  }

  if (error) {
    console.error(error)
    return { ...geoJsonData, error } as GeoJsonDataMap & { error: string } // Return the current data and loading state
  }

  return geoJsonData
}

export default useGeoJsonMarkers
