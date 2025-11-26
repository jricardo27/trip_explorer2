import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography, Box, Chip } from "@mui/material"
import React from "react"
import ImageGallery from "react-image-gallery"

import { TripFeature } from "../../contexts/TripContext"

import "react-image-gallery/styles/css/image-gallery.css"

interface FeatureDetailsModalProps {
  open: boolean
  onClose: () => void
  feature: TripFeature | null
}

export const FeatureDetailsModal: React.FC<FeatureDetailsModalProps> = ({ open, onClose, feature }) => {
  if (!feature) return null

  const images = (feature.properties.images as string[]) || []
  const galleryImages = images.map((img: string) => ({
    original: img,
    thumbnail: img,
  }))

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{feature.properties.name || feature.properties.title || "Feature Details"}</DialogTitle>
      <DialogContent>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {galleryImages.length > 0 && (
            <Box sx={{ mb: 2 }}>
              <ImageGallery items={galleryImages} showPlayButton={false} />
            </Box>
          )}

          <Typography variant="body1">{feature.properties.description || "No description available."}</Typography>

          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
            {Object.entries(feature.properties).map(([key, value]) => {
              if (["id", "name", "title", "description", "images", "style"].includes(key)) return null
              if (typeof value === "object") return null
              return <Chip key={key} label={`${key}: ${value}`} variant="outlined" size="small" />
            })}
          </Box>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  )
}
