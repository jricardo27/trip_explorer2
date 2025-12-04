import FileSaver from "file-saver"
import tokml from "geojson-to-kml"
import JSZip from "jszip"

import { SavedFeaturesStateType } from "../../contexts/SavedFeaturesContext.ts"
import { GeoJsonCollection, GeoJsonFeature } from "../../data/types"
import formatFeature from "../../utils/formatFeature.ts"

const convertToMultiLineString = (feature: GeoJsonFeature): GeoJsonFeature => {
  if (feature.geometry.type === "Polygon") {
    // For a Polygon, convert only the outer ring to a LineString
    return {
      ...feature,
      geometry: {
        type: "MultiLineString",
        coordinates: [feature.geometry.coordinates[0]], // Only outer ring
      },
    }
  } else if (feature.geometry.type === "MultiPolygon") {
    // For MultiPolygon, convert each polygon's outer ring into a separate LineString within MultiLineString
    const multiLineStringCoords = feature.geometry.coordinates.map((polygon) => polygon[0]) // Outer ring of each polygon
    return {
      ...feature,
      geometry: {
        type: "MultiLineString",
        coordinates: multiLineStringCoords,
      },
    }
  } else {
    // If it's not a Polygon or MultiPolygon, return it unchanged
    return feature
  }
}

export const saveAsKml = (savedFeatures: SavedFeaturesStateType) => {
  const zip = new JSZip()

  Object.entries(savedFeatures).map(([category, features]) => {
    const data: GeoJsonCollection = {
      type: "FeatureCollection",
      features: features.map((feature): GeoJsonFeature => {
        feature = formatFeature(feature)
        feature = convertToMultiLineString(feature)
        return feature
      }),
    }

    const kml: string = tokml(data)
    zip.file(`${category}.kml`, kml)
  })

  zip.generateAsync({ type: "blob" }).then((blob) => {
    FileSaver.saveAs(blob, "trip_explorer_features.zip")
  })
}
