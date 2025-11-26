// geojson-to-kml.d.ts

declare module "geojson-to-kml" {
  import { Feature, FeatureCollection, Geometry } from "geojson"

  /**
   * Converts GeoJSON to KML
   * @param geojson - The GeoJSON object to convert
   * @param options - Options for KML generation
   * @returns A KML string
   */
  function tokml(
    geojson: Feature | FeatureCollection | Geometry,
    options?: {
      /**
       * Specify the document name in the KML output
       */
      documentName?: string
      /**
       * Specify the name for each feature in the KML
       */
      name?: string | ((feature: Feature) => string)
      /**
       * Specify the description for each feature in the KML
       */
      description?: string | ((feature: Feature) => string)
      /**
       * Provide a timestamp for each feature
       */
      timestamp?: string | ((feature: Feature) => string)
      /**
       * Specify the style for each feature
       */
      style?:
        | {
            /**
             * Icon URL for Point features
             */
            icon?: string
            /**
             * Color in KML format like 'ff0000ff' for blue
             */
            color?: string
            /**
             * Width of line for LineString or Polygon boundaries
             */
            width?: number
            /**
             * Fill color for Polygon
             */
            fill?: string
          }
        | ((feature: Feature) => any)
      /**
       * Whether to include a document element in the KML
       */
      document?: boolean
      /**
       * Include altitude in KML for 3D coordinates
       */
      altitude?: boolean
    },
  ): string

  export = tokml
}
