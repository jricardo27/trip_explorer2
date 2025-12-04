import { Button } from "@mui/material"
import L, { LeafletMouseEvent, PopupOptions } from "leaflet"
import React, { useCallback, useMemo } from "react"
import { createRoot } from "react-dom/client"
import { GeoJSON } from "react-leaflet"

import { GeoJsonFeature, GeoJsonCollection } from "../../data/types"
import { TTabMapping } from "../../data/types/TTabMapping"
import createCustomIcon from "../../utils/createCustomIcon"
import PopupContent, { iPopupContainerProps } from "../PopupContent/PopupContent"
import styles from "../PopupContent/PopupContent.module.css"

export interface menuActionButton {
  label: string
  onClick: (feature: GeoJsonFeature) => void
  startIcon?: React.ReactNode
  endIcon?: React.ReactNode
}

export interface onPopupOpenProps {
  feature: GeoJsonFeature
  layer: L.Layer
  popupTabMapping: TTabMapping
  popupContainerProps?: iPopupContainerProps
  bottomMenu?: React.ReactNode
}

export interface contextMenuHandlerProps {
  event: LeafletMouseEvent
  feature: GeoJsonFeature | null
}

interface StyleGeoJsonProps {
  data: GeoJsonCollection | null
  popupTabMapping?: TTabMapping
  popupTabMappingExtra?: TTabMapping
  popupOpenHandler?: ({ feature, layer, popupTabMapping }: onPopupOpenProps) => void
  contextMenuHandler?: ({ event, feature }: contextMenuHandlerProps) => void
  popupProps?: PopupOptions
  popupContainerProps?: iPopupContainerProps
  popupActionButtons?: menuActionButton[]
}

const StyledGeoJson = ({
  data,
  popupTabMapping,
  popupTabMappingExtra,
  popupOpenHandler,
  contextMenuHandler,
  popupProps,
  popupContainerProps,
  popupActionButtons,
}: StyleGeoJsonProps): React.ReactNode => {
  const pointToLayer = useCallback((feature: GeoJsonFeature, latlng: L.LatLng) => {
    const iconName = feature.properties?.style?.icon || "fa/FaMapMarker"
    const iconColor = feature.properties?.style?.color || "grey"
    const innerIconColor = feature.properties?.style?.innerIconColor || iconColor
    const customIcon = createCustomIcon(iconName, iconColor, innerIconColor)
    return L.marker(latlng, { icon: customIcon })
  }, [])

  const defaultTabMapping: TTabMapping = useMemo(
    () => ({
      General: ["name", "url", { key: "description", className: styles.scrollableContent }],
    }),
    [],
  )

  const defaultOnPopupOpen = useCallback(
    ({ feature, layer, popupTabMapping, popupContainerProps, bottomMenu }: onPopupOpenProps) => {
      // Get the popup element
      const popup = layer.getPopup()
      if (popup) {
        // Create a container for the popup content
        const container = L.DomUtil.create("div")
        const root = createRoot(container)
        root.render(
          <PopupContent
            feature={feature as GeoJsonFeature}
            tabMapping={popupTabMapping}
            containerProps={popupContainerProps}
            bottomMenu={bottomMenu}
          />,
        )

        // Set the popup content
        popup.setContent(container)
      }
    },
    [],
  )

  const onPopupOpenHandler = popupOpenHandler || defaultOnPopupOpen
  const tabMapping = Object.assign({}, popupTabMapping || defaultTabMapping, popupTabMappingExtra || {})

  return (
    <GeoJSON
      key={JSON.stringify(data)}
      data={data as GeoJsonCollection}
      pointToLayer={pointToLayer}
      onEachFeature={(feature, layer) => {
        if (feature.properties) {
          if (feature.properties.name) {
            layer.bindTooltip(`${feature.properties.name}`, { permanent: false, direction: "auto" })
          }

          layer.bindPopup("", { ...(popupProps || {}) }) // Initialize with empty content

          // Add an event listener for when the popup opens
          layer.on("popupopen", () => {
            const bottomMenu = (
              <>
                {popupActionButtons?.map((props: menuActionButton, index) => (
                  <Button
                    key={index}
                    startIcon={props?.startIcon}
                    endIcon={props?.endIcon}
                    onClick={() => {
                      props.onClick(feature)
                    }}
                  >
                    {props.label}
                  </Button>
                ))}
              </>
            )

            onPopupOpenHandler({
              feature,
              layer,
              popupTabMapping: tabMapping,
              popupContainerProps: popupContainerProps,
              bottomMenu: bottomMenu,
            })
          })

          if (contextMenuHandler) {
            layer.on("contextmenu", (event) => {
              contextMenuHandler({ event, feature })
            })
          }
        }
      }}
    />
  )
}

export default StyledGeoJson
