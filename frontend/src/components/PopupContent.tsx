import React, { useState } from "react"
import { Tabs, Tab, Box, Typography } from "@mui/material"
import ImageGallery from "react-image-gallery"
import "react-image-gallery/styles/css/image-gallery.css"

interface PopupContentProps {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    properties: any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    images?: any[]
    title: string
}

const PopupContent = ({ properties, images = [], title }: PopupContentProps) => {
    const [tabValue, setTabValue] = useState(0)
    // const theme = useTheme()

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
        <Box sx={{ display: "flex", flexDirection: "column", width: "300px", maxWidth: "100%" }}>
            <Typography variant="h6" gutterBottom>
                {title}
            </Typography>

            <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
                <Tabs value={tabValue} onChange={handleTabChange} variant="scrollable" scrollButtons="auto">
                    {hasDetails && <Tab label="Details" />}
                    {hasImages && <Tab label="Gallery" />}
                </Tabs>
            </Box>

            {hasDetails && (
                <div role="tabpanel" hidden={tabValue !== 0}>
                    {tabValue === 0 && (
                        <Box sx={{ p: 2, maxHeight: "200px", overflowY: "auto" }}>
                            {displayProperties.map(([key, value]) => (
                                <Box key={key} sx={{ mb: 1 }}>
                                    <Typography variant="subtitle2" component="span" fontWeight="bold">
                                        {key}:{" "}
                                    </Typography>
                                    <Typography variant="body2" component="span">
                                        {String(value)}
                                    </Typography>
                                </Box>
                            ))}
                        </Box>
                    )}
                </div>
            )}

            {hasImages && (
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
    )
}

export default PopupContent
