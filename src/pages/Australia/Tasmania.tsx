import React, { useMemo } from "react"

import { FeatureMap } from "../../components/MapComponent/FeatureMap"
import styles from "../../components/PopupContent/PopupContent.module.css"
import { HOBART_LOCATION } from "../../data/locations"
import { TTabMapping } from "../../data/types/TTabMapping.ts"

interface TasmaniaProps {
  drawerOpen: boolean
  closeDrawer: () => void
  isPinned?: boolean
  onTogglePin?: () => void
}

export const Tasmania = ({ drawerOpen, closeDrawer, isPinned, onTogglePin }: TasmaniaProps): React.ReactNode => {
  const geoJsonOverlaySources = useMemo(
    (): Record<string, TTabMapping> => ({
      "/markers/tasmania/accommodation_TAS.json": {
        General: ["name", "website", "tarif", "isBookable"],
        "More Info": ["operatorName", "GroupName", "CheckInTime", "CheckOutTime", "email", "address", "hours"],
      },
      "/markers/tasmania/accommodation_campermate.json": {
        General: ["name", "fees", "bookable", { key: "description", className: styles.scrollableContent }],
        Score: ["score", "thumbs_up", "thumbs_down"],
      },
      "/markers/tasmania/toiletmap_aus_2025_TAS.json": {
        General: ["Name", "Male", "Female", "Unisex", "Shower", "OpeningHours", "OpeningHoursNote", "Address1", "URL"],
      },
      "/markers/tasmania/big4_holiday_parks_TAS.json": {
        General: ["name", "website", "reviews"],
      },
      "/markers/tasmania/discovery_parks_TAS.json": {
        General: ["name", "area", "website", "reviews"],
      },
    }),
    [],
  )

  return (
    <FeatureMap
      center={HOBART_LOCATION}
      geoJsonOverlaySources={geoJsonOverlaySources}
      drawerOpen={drawerOpen}
      closeDrawer={closeDrawer}
      isPinned={isPinned}
      onTogglePin={onTogglePin}
    />
  )
}
