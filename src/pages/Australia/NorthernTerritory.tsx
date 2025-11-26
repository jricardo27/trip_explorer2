import React, { useMemo } from "react"

import { FeatureMap } from "../../components/MapComponent/FeatureMap"
import styles from "../../components/PopupContent/PopupContent.module.css"
import { DARWIN_LOCATION } from "../../data/locations"
import { TTabMapping } from "../../data/types/TTabMapping"

interface NorthernTerritoryProps {
  drawerOpen: boolean
  closeDrawer: () => void
  isPinned?: boolean
  onTogglePin?: () => void
}

export const NorthernTerritory = ({
  drawerOpen,
  closeDrawer,
  isPinned,
  onTogglePin,
}: NorthernTerritoryProps): React.ReactNode => {
  const geoJsonOverlaySources = useMemo(
    (): Record<string, TTabMapping> => ({
      "/markers/northernTerritory/accommodation_NT.json": {
        General: ["name", "website", "tarif", "isBookable"],
        "More Info": ["operatorName", "GroupName", "CheckInTime", "CheckOutTime", "email", "address", "hours"],
      },
      "/markers/northernTerritory/accommodation_campermate.json": {
        General: ["name", "fees", "bookable", { key: "description", className: styles.scrollableContent }],
        Score: ["score", "thumbs_up", "thumbs_down"],
      },
      "/markers/northernTerritory/toiletmap_aus_2025_NT.json": {
        General: ["Name", "Male", "Female", "Unisex", "Shower", "OpeningHours", "OpeningHoursNote", "Address1", "URL"],
      },
      "/markers/northernTerritory/big4_holiday_parks_NT.json": {
        General: ["name", "website", "reviews"],
      },
      "/markers/northernTerritory/discovery_parks_NT.json": {
        General: ["name", "area", "website", "reviews"],
      },
    }),
    [],
  )

  return (
    <FeatureMap
      center={DARWIN_LOCATION}
      geoJsonOverlaySources={geoJsonOverlaySources}
      drawerOpen={drawerOpen}
      closeDrawer={closeDrawer}
      isPinned={isPinned}
      onTogglePin={onTogglePin}
    />
  )
}
