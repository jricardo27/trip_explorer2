import { Feature, FeatureCollection, GeoJsonProperties as BaseGeoJsonProperties } from "geojson" // eslint-disable-line import/no-unresolved

export type GeoJsonProperties = BaseGeoJsonProperties

export type GeoJsonFeature = Feature

export interface GeoJsonCollection extends FeatureCollection {
  properties?: GeoJsonProperties
}

export type GeoJsonDataMap = Record<string, GeoJsonCollection | null>
