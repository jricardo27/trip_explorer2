import React, { useMemo } from "react"

import { FeatureMap } from "../../components/MapComponent/FeatureMap"
import styles from "../../components/PopupContent/PopupContent.module.css"
import { MELBOURNE_LOCATION } from "../../data/locations"
import { TTabMapping } from "../../data/types/TTabMapping"

interface VictoriaProps {
  drawerOpen: boolean
  closeDrawer: () => void
  isPinned?: boolean
  onTogglePin?: () => void
}

export const Victoria = ({ drawerOpen, closeDrawer, isPinned, onTogglePin }: VictoriaProps): React.ReactNode => {
  const geoJsonOverlaySources = useMemo(
    (): Record<string, TTabMapping> => ({
      "/markers/victoria/accommodation_VIC.json": {
        General: ["name", "website", "tarif", "isBookable"],
        "More Info": ["operatorName", "GroupName", "CheckInTime", "CheckOutTime", "email", "address", "hours"],
      },
      "/markers/victoria/accommodation_campermate.json": {
        General: ["name", "fees", "bookable", { key: "description", className: styles.scrollableContent }],
        Score: ["score", "thumbs_up", "thumbs_down"],
      },
      "/markers/victoria/toiletmap_aus_2025_VIC.json": {
        General: ["Name", "Male", "Female", "Unisex", "Shower", "OpeningHours", "OpeningHoursNote", "Address1", "URL"],
      },
      "/markers/victoria/big4_holiday_parks_VIC.json": {
        General: ["name", "website", "reviews"],
      },
      "/markers/victoria/discovery_parks_VIC.json": {
        General: ["name", "area", "website", "reviews"],
      },
    }),
    [],
  )

  return (
    <FeatureMap
      center={MELBOURNE_LOCATION}
      geoJsonOverlaySources={geoJsonOverlaySources}
      drawerOpen={drawerOpen}
      closeDrawer={closeDrawer}
      isPinned={isPinned}
      onTogglePin={onTogglePin}
    />
  )
}
