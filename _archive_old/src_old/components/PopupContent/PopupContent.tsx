import { Tabs, Tab, Box, Typography, useTheme, useMediaQuery } from "@mui/material"
import { Variant } from "@mui/material/styles/createTypography"
import React, { useState } from "react"
import ImageGallery from "react-image-gallery"

import "react-image-gallery/styles/css/image-gallery.css"
import "./leaflet.popup.css"

import { GeoJsonFeature } from "../../data/types"
import { TTabMapping, TTabMappingDynamicTab } from "../../data/types/TTabMapping"

import styles from "./PopupContent.module.css"

export interface iPopupContainerProps {
  height?: number | string
}

export interface iPopupContentProps {
  feature: GeoJsonFeature
  tabMapping: TTabMapping
  containerProps?: iPopupContainerProps
  bottomMenu?: React.ReactNode
}

const PopupContent = ({ feature, tabMapping, containerProps, bottomMenu }: iPopupContentProps): React.ReactNode => {
  const [tabValue, setTabValue] = useState(0)
  const theme = useTheme()
  const isXs = useMediaQuery(theme.breakpoints.down("sm"))
  const isSm = useMediaQuery(theme.breakpoints.between("sm", "md"))

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue)
  }

  // Extract images for the slideshow
  const images = feature.properties?.images
    ? feature.properties.images.map((entry: string | { src: string; title: string }) => {
        const url = typeof entry === "string" ? entry : entry.src
        const title = typeof entry === "string" ? "" : entry.title

        return {
          original: url,
          thumbnail: url,
          originalTitle: title,
          thumbnailTitle: title,
        }
      })
    : []

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", flexDirection: "row", height: containerProps?.height || "400px" }}>
        <div className={styles.tabsContainer}>
          {/* Tabs for properties */}
          <Tabs value={tabValue} onChange={handleTabChange}>
            {Object.keys(tabMapping).map((tabName) => (
              <Tab key={tabName} label={tabName} />
            ))}
            {(isXs || isSm) && images.length > 0 && <Tab label="Gallery" />}
          </Tabs>

          {/* Tab content */}
          {Object.entries(tabMapping).map(([tabName, tabKeys], index) => (
            <div key={tabName} role="tabpanel" hidden={tabValue !== index} id={`tabpanel-${index}`}>
              {tabValue === index && (
                <Box sx={{ p: 1 }}>
                  {tabKeys.map((entry: string | TTabMappingDynamicTab) => {
                    if (!feature.properties) return null

                    let value = null
                    let propTitle: string | number = ""
                    let className = ""
                    let isHtml = false
                    let isFlat = true
                    let htmlComponent: React.ElementType = "div"
                    let htmlVariant: Variant = "subtitle1"

                    if (typeof entry === "string") {
                      propTitle = entry
                      value = feature.properties[entry]
                    } else {
                      propTitle = entry.key
                      value = feature.properties[entry.key]
                      className = entry.className || ""
                      isHtml = entry.isHtml || false
                      isFlat = false
                    }

                    if (
                      isFlat &&
                      (typeof value === "string" || typeof value === "number" || typeof value === "boolean")
                    ) {
                      return (
                        <Typography key={propTitle} variant="subtitle1">
                          <strong>{propTitle}:</strong>
                          <span> {String(value)}</span>
                        </Typography>
                      )
                    } else if (typeof value === "object" && value !== null) {
                      value = JSON.stringify(value, null, 2)
                      htmlComponent = "pre"
                      htmlVariant = "body2"
                    }

                    return (
                      <div key={propTitle} style={{ marginBottom: "8px" }}>
                        <Typography variant="subtitle1">
                          <strong>{propTitle}:</strong>
                        </Typography>
                        {value && !isHtml && (
                          <Typography component={htmlComponent} variant={htmlVariant} className={className}>
                            {String(value)}
                          </Typography>
                        )}
                        {value && isHtml && (
                          <Typography
                            component="div"
                            className={className}
                            dangerouslySetInnerHTML={{ __html: value }}
                          />
                        )}
                      </div>
                    )
                  })}
                </Box>
              )}
            </div>
          ))}

          {/* Image gallery as a tab on small screens */}
          {(isXs || isSm) && images.length > 0 && (
            <div
              role="tabpanel"
              hidden={tabValue !== Object.keys(tabMapping).length}
              id={`tabpanel-${Object.keys(tabMapping).length}`}
              style={{ display: tabValue === Object.keys(tabMapping).length ? "block" : "none" }}
            >
              {tabValue === Object.keys(tabMapping).length && (
                <Box sx={{ p: 1 }}>
                  <ImageGallery items={images} showNav={false} showPlayButton={false} />
                </Box>
              )}
            </div>
          )}
        </div>

        {/* Image slideshow */}
        {!(isXs || isSm) && images.length > 0 && (
          <div style={{ width: "50%", flex: 1 }}>
            <ImageGallery items={images} showNav={false} showPlayButton={false} />
          </div>
        )}
      </div>
      {bottomMenu && (
        <div
          style={{
            height: "30px",
            borderTop: "1px solid #ccc",
            display: "flex",
            justifyContent: "flex-end",
            alignItems: "center",
          }}
        >
          {bottomMenu}
        </div>
      )}
    </div>
  )
}

export default PopupContent
