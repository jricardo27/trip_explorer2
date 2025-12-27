import { Add, Edit as EditIcon, HelpOutline, SwapHoriz, Clear, AutoFixHigh as AutoFetchIcon } from "@mui/icons-material"
import { Box, Button, IconButton, Tooltip, Typography, CircularProgress } from "@mui/material"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"

import { transportApi } from "../../api/client"
import { useTripDetails } from "../../hooks/useTripDetails"
import { useLanguageStore } from "../../stores/languageStore"
import type { TransportAlternative, Activity } from "../../types"

import { FetchTransportOptionsDialog } from "./FetchTransportOptionsDialog"
import { TransportViewDialog, TransportEditDialog, TransportSelectionDialog } from "./TransportDialogs"
import { getTransportIcon, getModeLabel, formatDuration } from "./transportUtils"

interface TransportSegmentProps {
  tripId: string
  fromActivityId: string
  toActivityId: string
  fromActivity?: Activity
  toActivity?: Activity
  alternatives: TransportAlternative[]
  currencies?: string[]
}

export const TransportSegment = ({
  tripId,
  fromActivityId,
  toActivityId,
  fromActivity,
  toActivity,
  alternatives,
  currencies = ["AUD"],
}: TransportSegmentProps) => {
  const queryClient = useQueryClient()
  const { t } = useLanguageStore()
  const { fetchSegmentTransport, isFetchingTransport } = useTripDetails(tripId)

  const [viewOpen, setViewOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [selectOpen, setSelectOpen] = useState(false)
  const [fetchOpen, setFetchOpen] = useState(false)
  const [editingAlt, setEditingAlt] = useState<TransportAlternative | undefined>(undefined)

  const deselectAllMutation = useMutation({
    mutationFn: () => transportApi.deselectAll(tripId, fromActivityId, toActivityId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trips", tripId] })
      queryClient.invalidateQueries({ queryKey: ["public-trip"] })
    },
  })

  const displayAlt = alternatives.find((a: TransportAlternative) => a.isSelected)
  const optionsCount = alternatives.length

  const handleOpenDetails = () => setViewOpen(true)
  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation()
    setEditingAlt(displayAlt)
    setEditOpen(true)
  }
  const handleSwap = (e: React.MouseEvent) => {
    e.stopPropagation()
    setSelectOpen(true)
  }
  const handleAdd = () => {
    setEditingAlt(undefined)
    setEditOpen(true)
  }
  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    deselectAllMutation.mutate()
  }

  const handleOpenFetch = (e: React.MouseEvent) => {
    e.stopPropagation()
    setFetchOpen(true)
  }

  const handleDoFetch = async (options: { modes: string[]; departureTime?: number }) => {
    await fetchSegmentTransport({
      fromActivityId,
      toActivityId,
      options,
    })
    setFetchOpen(false)
    setSelectOpen(true) // Open selection after fetch to show options
  }

  // Check if we have coordinates to enable fetch
  const canFetch = fromActivity?.latitude && fromActivity?.longitude && toActivity?.latitude && toActivity?.longitude

  return (
    <>
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", my: 1, gap: 0.5 }}>
        {displayAlt ? (
          <>
            <Button
              variant="text"
              onClick={handleOpenDetails}
              startIcon={getTransportIcon(displayAlt.transportMode)}
              sx={{
                textTransform: "none",
                color: "text.secondary",
                fontSize: "0.875rem",
                py: 0.5,
                "&:hover": { backgroundColor: "rgba(0,0,0,0.04)" },
              }}
            >
              <Typography variant="body2" color="text.secondary" fontWeight="medium" sx={{ mr: 1 }}>
                {getModeLabel(displayAlt.transportMode)}:
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {formatDuration(displayAlt.durationMinutes, t)} •{" "}
                {displayAlt.cost ? `${displayAlt.cost} ${displayAlt.currency || "USD"}` : t("free")}
                {optionsCount > 1 && ` • ${optionsCount} ${t("optionsAvailable")}`}
              </Typography>
            </Button>
            <Box sx={{ display: "flex", opacity: 0.6, "&:hover": { opacity: 1 }, alignItems: "center" }}>
              <Tooltip title="Edit transport details">
                <IconButton size="small" onClick={handleEdit} sx={{ color: "text.secondary" }}>
                  <EditIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Choose a different transport">
                <IconButton size="small" onClick={handleSwap} sx={{ color: "text.secondary" }}>
                  <SwapHoriz fontSize="small" />
                </IconButton>
              </Tooltip>
              {canFetch && (
                <Tooltip title="Auto-fetch options (Traffic aware)">
                  <IconButton
                    size="small"
                    onClick={handleOpenFetch}
                    sx={{ color: "primary.main" }}
                    disabled={isFetchingTransport}
                  >
                    {isFetchingTransport ? <CircularProgress size={16} /> : <AutoFetchIcon fontSize="small" />}
                  </IconButton>
                </Tooltip>
              )}
              <Tooltip title="Clear transport selection">
                <IconButton
                  size="small"
                  onClick={handleClear}
                  sx={{ color: "text.secondary" }}
                  disabled={deselectAllMutation.isPending}
                >
                  <Clear fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          </>
        ) : optionsCount > 0 ? (
          <Box display="flex" alignItems="center" gap={1}>
            <Button
              variant="text"
              onClick={() => setSelectOpen(true)}
              startIcon={<HelpOutline fontSize="small" />}
              sx={{
                textTransform: "none",
                color: "text.secondary",
                fontSize: "0.875rem",
                "&:hover": { backgroundColor: "rgba(0,0,0,0.04)" },
              }}
            >
              {optionsCount} {t("optionsAvailable")} ({t("chooseTransport")})
            </Button>
            {canFetch && (
              <Tooltip title="Fetch more options">
                <IconButton
                  size="small"
                  onClick={handleOpenFetch}
                  sx={{ color: "primary.main" }}
                  disabled={isFetchingTransport}
                >
                  {isFetchingTransport ? <CircularProgress size={16} /> : <AutoFetchIcon fontSize="small" />}
                </IconButton>
              </Tooltip>
            )}
          </Box>
        ) : (
          <Box display="flex" alignItems="center" gap={1}>
            <Button
              size="small"
              onClick={handleAdd}
              startIcon={<Add />}
              sx={{
                textTransform: "none",
                color: "primary.main",
                opacity: 0.7,
                "&:hover": { opacity: 1, backgroundColor: "rgba(25, 118, 210, 0.04)" },
              }}
            >
              Add Transport
            </Button>
            {canFetch && (
              <Tooltip title="Auto-fetch options (Traffic aware)">
                <IconButton
                  size="small"
                  onClick={handleOpenFetch}
                  sx={{ color: "primary.main" }}
                  disabled={isFetchingTransport}
                >
                  {isFetchingTransport ? <CircularProgress size={16} /> : <AutoFetchIcon fontSize="small" />}
                </IconButton>
              </Tooltip>
            )}
          </Box>
        )}
      </Box>

      {displayAlt && (
        <TransportViewDialog open={viewOpen} onClose={() => setViewOpen(false)} alternative={displayAlt} />
      )}

      <TransportEditDialog
        open={editOpen}
        onClose={() => setEditOpen(false)}
        tripId={tripId}
        fromActivityId={fromActivityId}
        toActivityId={toActivityId}
        alternative={editingAlt}
        currencies={currencies}
      />

      <TransportSelectionDialog
        open={selectOpen}
        onClose={() => setSelectOpen(false)}
        tripId={tripId}
        fromActivityId={fromActivityId}
        toActivityId={toActivityId}
        alternatives={alternatives}
        onEdit={(alt) => {
          setEditingAlt(alt)
          setSelectOpen(false)
          setEditOpen(true)
        }}
        onDelete={() => {
          // Handled by local mutation in dialog
        }}
      />

      {fromActivity && toActivity && (
        <FetchTransportOptionsDialog
          open={fetchOpen}
          onClose={() => setFetchOpen(false)}
          fromActivity={fromActivity}
          toActivity={toActivity}
          onFetch={handleDoFetch}
          isFetching={isFetchingTransport}
        />
      )}
    </>
  )
}
