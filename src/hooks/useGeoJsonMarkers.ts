import axios from "axios"
import { useEffect, useState } from "react"

import { GeoJsonCollection, GeoJsonDataMap, GeoJsonFeature, GeoJsonProperties, TAny } from "../data/types"
import deepMerge from "../utils/deepmerge.ts"

const useGeoJsonMarkers = (filenames: string[]): GeoJsonDataMap => {
  const [geoJsonData, setGeoJsonData] = useState<GeoJsonDataMap>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        const params: Record<string, Record<string, number>> = {}

        const isProduction = import.meta.env.MODE === "production"
        if (!isProduction) { // Always reload the files when running in development
          params["params"] = { t: Date.now() }
        }

        const promises = filenames.map(async (filename): Promise<[string, GeoJsonCollection]> => {
          // Remove leading slash if present for the query param
          const pathParam = filename.startsWith("/") ? filename : "/" + filename
          const response = await axios.get<GeoJsonCollection>("/api/markers", {
            params: {
              ...params.params,
              path: pathParam,
            },
          })

          if (typeof response.data == "string") {
            throw new Error(`Error requesting ${filename}, ensure that the path is valid.`)
          }

          return [filename, response.data]
        })

        const results = await Promise.all(promises)
        const dataMap: GeoJsonDataMap = results.reduce((acc: Record<string, GeoJsonCollection>, [filename, featureCollection]) => {
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
                  feature.properties![key] = deepMerge(sharedProperties[key] as Record<string, TAny>, sourceProp as Record<string, TAny>)
                } else {
                  // If sourceProp is not an object or is null, just assign sharedProperties value
                  feature.properties![key] = sharedProperties[key]
                }
              }
            })
          })

          acc[filename] = featureCollection
          return acc
        }, {})
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

    fetchData()
  }, [filenames])

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
