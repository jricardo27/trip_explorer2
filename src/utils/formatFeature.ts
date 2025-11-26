import Turndown from "turndown"

import { GeoJsonFeature } from "../data/types"

const formatFeature = (feature: GeoJsonFeature): GeoJsonFeature => {
  const new_feature: GeoJsonFeature = { ...feature }

  if (!new_feature.properties) {
    new_feature.properties = {}
  }

  if (feature.properties?.tripNotes) {
    const turndown = new Turndown()
    const tripNotes = turndown.turndown(feature.properties.tripNotes)

    if (tripNotes) {
      new_feature.properties.description =
        tripNotes + "\n\n--------------------\n\n" + new_feature.properties.description
    }
  }

  delete new_feature.properties?.id
  delete new_feature.properties?.style
  delete new_feature.properties?.images
  delete new_feature.properties?.tripNotes

  return new_feature
}

export default formatFeature
