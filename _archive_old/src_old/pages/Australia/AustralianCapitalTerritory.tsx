import React, { useMemo } from "react"

import { FeatureMap, OverlaySourceConfig } from "../../components/MapComponent/FeatureMap"
import styles from "../../components/PopupContent/PopupContent.module.css"
import { CANBERRA_LOCATION } from "../../data/locations"

interface AustralianCapitalTerritoryProps {
  drawerOpen: boolean
  closeDrawer: () => void
  isPinned?: boolean
  onTogglePin?: () => void
}

export const AustralianCapitalTerritory = ({
  drawerOpen,
  closeDrawer,
  isPinned,
  onTogglePin,
}: AustralianCapitalTerritoryProps): React.ReactNode => {
  const geoJsonOverlaySources = useMemo(
    (): Record<string, OverlaySourceConfig> => ({
      "/markers/australianCapitalTerritory/accommodation_ACT.json": {
        name: "Accommodation in ACT",
        tabMapping: {
          General: ["name", "website", "tarif", "isBookable"],
          "More Info": ["operatorName", "GroupName", "CheckInTime", "CheckOutTime", "email", "address", "hours"],
        },
      },
      "/markers/australianCapitalTerritory/accommodation_campermate.json": {
        name: "Accommodation (Campermate)",
        tabMapping: {
          General: ["name", "fees", "bookable", { key: "description", className: styles.scrollableContent }],
          Score: ["score", "thumbs_up", "thumbs_down"],
        },
      },
      "/markers/australianCapitalTerritory/toiletmap_aus_2025_ACT.json": {
        name: "Toilets",
        tabMapping: {
          General: [
            "Name",
            "Male",
            "Female",
            "Unisex",
            "Shower",
            "OpeningHours",
            "OpeningHoursNote",
            "Address1",
            "URL",
          ],
        },
      },
    }),
    [],
  )

  return (
    <FeatureMap
      center={CANBERRA_LOCATION}
      geoJsonOverlaySources={geoJsonOverlaySources}
      drawerOpen={drawerOpen}
      closeDrawer={closeDrawer}
      isPinned={isPinned}
      onTogglePin={onTogglePin}
    />
  )
}
