import DeleteIcon from "@mui/icons-material/Delete"
import DirectionsBikeIcon from "@mui/icons-material/DirectionsBike"
import DirectionsBoatIcon from "@mui/icons-material/DirectionsBoat"
import DirectionsBusIcon from "@mui/icons-material/DirectionsBus"
import DirectionsCarIcon from "@mui/icons-material/DirectionsCar"
import DirectionsTransitIcon from "@mui/icons-material/DirectionsTransit"
import DirectionsWalkIcon from "@mui/icons-material/DirectionsWalk"
import EditIcon from "@mui/icons-material/Edit"
import FlightIcon from "@mui/icons-material/Flight"
import MoreVertIcon from "@mui/icons-material/MoreVert"
import TrainIcon from "@mui/icons-material/Train"
import { Card, CardContent, Typography, Box, Button, Stack, IconButton, Menu, MenuItem } from "@mui/material"
import React from "react"

import { TransportAlternative, ValidationResult } from "../../types/transport"

import FeasibilityBadge from "./FeasibilityBadge"

interface AlternativeCardProps {
  alternative: TransportAlternative
  validation?: ValidationResult
  onSelect: (id: string) => void
  onEdit: (alternative: TransportAlternative) => void
  onDelete: (id: string) => void
  isSelected: boolean
}

const getTransportIcon = (mode: string) => {
  switch (mode) {
    case "driving":
      return <DirectionsCarIcon />
    case "walking":
      return <DirectionsWalkIcon />
    case "cycling":
      return <DirectionsBikeIcon />
    case "transit":
      return <DirectionsTransitIcon />
    case "flight":
      return <FlightIcon />
    case "train":
      return <TrainIcon />
    case "bus":
      return <DirectionsBusIcon />
    case "ferry":
      return <DirectionsBoatIcon />
    default:
      return <DirectionsCarIcon />
  }
}

const AlternativeCard: React.FC<AlternativeCardProps> = ({
  alternative,
  validation,
  onSelect,
  onEdit,
  onDelete,
  isSelected,
}) => {
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null)
  const open = Boolean(anchorEl)

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>) => {
    event.stopPropagation()
    setAnchorEl(event.currentTarget)
  }

  const handleMenuClose = () => {
    setAnchorEl(null)
  }

  const handleEdit = () => {
    handleMenuClose()
    onEdit(alternative)
  }

  const handleDelete = () => {
    handleMenuClose()
    onDelete(alternative.id)
  }

  return (
    <Card
      variant={isSelected ? "elevation" : "outlined"}
      sx={{
        mb: 2,
        border: isSelected ? "2px solid #1976d2" : undefined,
        bgcolor: isSelected ? "rgba(25, 118, 210, 0.04)" : undefined,
        position: "relative",
      }}
    >
      <CardContent>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
          <Stack direction="row" spacing={2} alignItems="center">
            <Box sx={{ color: "text.secondary" }}>{getTransportIcon(alternative.transport_mode)}</Box>
            <Box>
              <Typography variant="subtitle1" component="div">
                {alternative.name}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {alternative.duration_minutes} min
                {alternative.buffer_minutes > 0 && ` (+${alternative.buffer_minutes} buffer)`}
                {alternative.cost && ` • ${alternative.currency} ${alternative.cost}`}
              </Typography>
            </Box>
          </Stack>

          <Box>
            {validation && (
              <FeasibilityBadge
                isFeasible={validation.is_feasible}
                reason={validation.reason}
                conflicts={validation.conflicts}
              />
            )}
            <IconButton size="small" onClick={handleMenuClick} sx={{ ml: 1 }}>
              <MoreVertIcon />
            </IconButton>
          </Box>
        </Stack>

        {alternative.description && (
          <Typography variant="body2" sx={{ mt: 1, mb: 1 }}>
            {alternative.description}
          </Typography>
        )}

        {(alternative.pros?.length || 0) > 0 && (
          <Box sx={{ mt: 1 }}>
            <Typography variant="caption" color="success.main" fontWeight="bold">
              Pros:
            </Typography>
            <Typography variant="caption" display="block">
              {alternative.pros?.join(", ")}
            </Typography>
          </Box>
        )}

        {(alternative.cons?.length || 0) > 0 && (
          <Box sx={{ mt: 0.5 }}>
            <Typography variant="caption" color="error.main" fontWeight="bold">
              Cons:
            </Typography>
            <Typography variant="caption" display="block">
              {alternative.cons?.join(", ")}
            </Typography>
          </Box>
        )}

        {!isSelected && (
          <Button variant="outlined" size="small" fullWidth sx={{ mt: 2 }} onClick={() => onSelect(alternative.id)}>
            Select Option
          </Button>
        )}
      </CardContent>

      <Menu anchorEl={anchorEl} open={open} onClose={handleMenuClose}>
        <MenuItem onClick={handleEdit}>
          <EditIcon fontSize="small" sx={{ mr: 1 }} /> Edit
        </MenuItem>
        <MenuItem onClick={handleDelete} sx={{ color: "error.main" }}>
          <DeleteIcon fontSize="small" sx={{ mr: 1 }} /> Delete
        </MenuItem>
      </Menu>
    </Card>
  )
}

export default AlternativeCard
