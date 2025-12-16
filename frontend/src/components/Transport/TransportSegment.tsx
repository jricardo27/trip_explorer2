import {
  Add,
  DirectionsCar,
  DirectionsBus,
  DirectionsWalk,
  Train,
  Flight,
  DirectionsBoat,
  PedalBike,
  HelpOutline,
} from "@mui/icons-material"
import { Box, Button } from "@mui/material"
import { useState } from "react"

import { TransportMode } from "../../types"
import type { TransportAlternative } from "../../types"

import { TransportDialog } from "./TransportDialog"

interface TransportSegmentProps {
  tripId: string
  fromActivityId: string
  toActivityId: string
  alternatives: TransportAlternative[]
}

const getIcon = (mode: TransportMode) => {
  switch (mode) {
    case TransportMode.DRIVING:
      return <DirectionsCar fontSize="small" />
    case TransportMode.WALKING:
      return <DirectionsWalk fontSize="small" />
    case TransportMode.CYCLING:
      return <PedalBike fontSize="small" />
    case TransportMode.TRANSIT:
      return <DirectionsBus fontSize="small" />
    case TransportMode.BUS:
      return <DirectionsBus fontSize="small" />
    case TransportMode.TRAIN:
      return <Train fontSize="small" />
    case TransportMode.FLIGHT:
      return <Flight fontSize="small" />
    case TransportMode.FERRY:
      return <DirectionsBoat fontSize="small" />
    default:
      return <HelpOutline fontSize="small" />
  }
}

export const TransportSegment = ({ tripId, fromActivityId, toActivityId, alternatives }: TransportSegmentProps) => {
  const [open, setOpen] = useState(false)
  // Actually, if none selected, we might show "X options" or just the first one.
  // Ideally backend ensures one is selected? Or explicit "isSelected".

  const displayAlt = alternatives.find((a) => a.isSelected)

  return (
    <>
      <Box sx={{ display: "flex", justifyContent: "center", my: 1 }}>
        {displayAlt ? (
          <Button
            variant="text"
            onClick={() => setOpen(true)}
            startIcon={getIcon(displayAlt.transportMode)}
            sx={{ textTransform: "none", color: "text.secondary", fontSize: "0.875rem" }}
          >
            {displayAlt.durationMinutes} min • {displayAlt.cost ? `$${displayAlt.cost}` : "Free"}
          </Button>
        ) : alternatives.length > 0 ? (
          <Button
            variant="text"
            onClick={() => setOpen(true)}
            sx={{ textTransform: "none", color: "text.secondary", fontSize: "0.875rem" }}
          >
            {alternatives.length} options available
          </Button>
        ) : (
          <Button
            size="small"
            onClick={() => setOpen(true)}
            startIcon={<Add />}
            sx={{ textTransform: "none", color: "primary.main", opacity: 0.7, "&:hover": { opacity: 1 } }}
          >
            Add Transport
          </Button>
        )}
      </Box>

      <TransportDialog
        open={open}
        onClose={() => setOpen(false)}
        tripId={tripId}
        fromActivityId={fromActivityId}
        toActivityId={toActivityId}
        alternatives={alternatives}
      />
    </>
  )
}
