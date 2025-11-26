import React, { useMemo } from "react"

import { FeatureMap } from "../../components/MapComponent/FeatureMap"
import styles from "../../components/PopupContent/PopupContent.module.css"
import { ADELAIDE_LOCATION } from "../../data/locations"
import { TTabMapping } from "../../data/types/TTabMapping"

interface SouthAustraliaProps {
  drawerOpen: boolean
  closeDrawer: () => void
  isPinned?: boolean
  onTogglePin?: () => void
}

export const SouthAustralia = ({
  drawerOpen,
  closeDrawer,
  isPinned,
  onTogglePin,
}: SouthAustraliaProps): React.ReactNode => {
  const geoJsonOverlaySources = useMemo(
    (): Record<string, TTabMapping> => ({
      "/markers/southAustralia/accommodation_SA.json": {
        General: ["name", "website", "tarif", "isBookable"],
        "More Info": ["operatorName", "GroupName", "CheckInTime", "CheckOutTime", "email", "address", "hours"],
      },
      "/markers/southAustralia/accommodation_campermate.json": {
        General: ["name", "fees", "bookable", { key: "description", className: styles.scrollableContent }],
        Score: ["score", "thumbs_up", "thumbs_down"],
      },
      "/markers/southAustralia/toiletmap_aus_2025_SA.json": {
        General: ["Name", "Male", "Female", "Unisex", "Shower", "OpeningHours", "OpeningHoursNote", "Address1", "URL"],
      },
      "/markers/southAustralia/big4_holiday_parks_SA.json": {
        General: ["name", "website", "reviews"],
      },
      "/markers/southAustralia/discovery_parks_SA.json": {
        General: ["name", "area", "website", "reviews"],
      },
    }),
    [],
  )

  return (
    <FeatureMap
      center={ADELAIDE_LOCATION}
      geoJsonOverlaySources={geoJsonOverlaySources}
      drawerOpen={drawerOpen}
      closeDrawer={closeDrawer}
      isPinned={isPinned}
      onTogglePin={onTogglePin}
    />
  )
}
