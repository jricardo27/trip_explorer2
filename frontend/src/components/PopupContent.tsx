import { Tabs, Tab, Box, Typography, useTheme, useMediaQuery } from "@mui/material"
import React, { useState } from "react"
import ImageGallery from "react-image-gallery"
import "react-image-gallery/styles/css/image-gallery.css"

interface PopupContentProps {
  properties: any
  images?: any[]
  title: string
}

const PopupContent = ({ properties, images = [], title }: PopupContentProps) => {
  const [tabValue, setTabValue] = useState(0)
  const theme = useTheme()
  const isSmall = useMediaQuery(theme.breakpoints.down("md"))

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue)
  }

  // Filter out internal/technical keys
  const displayProperties = Object.entries(properties).filter(
    ([key]) =>
      !["style", "id", "ID", "lat", "lng", "geometry", "images", "name", "Name", "title", "Title"].includes(key),
  )

  // Group properties if needed, for now just one "Details" tab + Gallery
  const hasImages = images && images.length > 0
  const hasDetails = displayProperties.length > 0

  return (
    <Box sx={{ display: "flex", flexDirection: "column", minWidth: "320px", maxWidth: "100%" }}>
      <Typography variant="h6" gutterBottom sx={{ fontWeight: "bold" }}>
        {title}
      </Typography>

      <Box sx={{ display: "flex", flexDirection: isSmall ? "column" : "row", minHeight: isSmall ? "auto" : "400px" }}>
        {/* Tabs and Content */}
        <Box sx={{ flex: hasImages && !isSmall ? "0 0 50%" : "1", display: "flex", flexDirection: "column" }}>
          <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
            <Tabs value={tabValue} onChange={handleTabChange} variant="scrollable" scrollButtons="auto">
              {hasDetails && <Tab label="Details" />}
              {hasImages && isSmall && <Tab label="Gallery" />}
            </Tabs>
          </Box>

          {hasDetails && (
            <div role="tabpanel" hidden={tabValue !== 0}>
              {tabValue === 0 && (
                <Box sx={{ p: 2, maxHeight: isSmall ? "200px" : "350px", overflowY: "auto" }}>
                  {displayProperties.map(([key, value]) => (
                    <Box key={key} sx={{ mb: 1.5 }}>
                      <Typography variant="subtitle2" component="div" fontWeight="bold" color="text.primary">
                        {key}:
                      </Typography>
                      <Typography variant="body2" component="div" color="text.secondary" sx={{ mt: 0.5 }}>
                        {String(value)}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              )}
            </div>
          )}

          {hasImages && isSmall && (
            <div role="tabpanel" hidden={tabValue !== (hasDetails ? 1 : 0)}>
              {tabValue === (hasDetails ? 1 : 0) && (
                <Box sx={{ p: 1 }}>
                  <ImageGallery
                    items={images.map((img) => ({
                      original: typeof img === "string" ? img : img.src,
                      thumbnail: typeof img === "string" ? img : img.src,
                    }))}
                    showNav={true}
                    showPlayButton={false}
                    showFullscreenButton={true}
                    useBrowserFullscreen={false}
                  />
                </Box>
              )}
            </div>
          )}
        </Box>

        {/* Image Gallery (Desktop - Side by Side) */}
        {hasImages && !isSmall && (
          <Box sx={{ flex: "0 0 50%", pl: 1 }}>
            <ImageGallery
              items={images.map((img) => ({
                original: typeof img === "string" ? img : img.src,
                thumbnail: typeof img === "string" ? img : img.src,
              }))}
              showNav={true}
              showPlayButton={false}
              showFullscreenButton={true}
              useBrowserFullscreen={false}
            />
          </Box>
        )}
      </Box>
    </Box>
  )
}

export default PopupContent
