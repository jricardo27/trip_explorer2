import AddIcon from "@mui/icons-material/Add"
import CloseIcon from "@mui/icons-material/Close"
import { Box, Typography, Button, CircularProgress, Alert, Drawer, IconButton } from "@mui/material"
import axios from "axios"
import React, { useState, useEffect, useCallback } from "react"

import { TransportAlternative, ValidationResult } from "../../types/transport"

import AddTransportAlternativeForm from "./AddTransportAlternativeForm"
import AlternativeCard from "./AlternativeCard"

interface TransportAlternativesPanelProps {
  tripId: string
  fromActivityId: string
  toActivityId: string
  isOpen: boolean
  onClose: () => void
  onTransportSelected: () => void
}

const TransportAlternativesPanel: React.FC<TransportAlternativesPanelProps> = ({
  tripId,
  fromActivityId,
  toActivityId,
  isOpen,
  onClose,
  onTransportSelected,
}) => {
  const [alternatives, setAlternatives] = useState<TransportAlternative[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [validations, setValidations] = useState<Record<string, ValidationResult>>({})
  const [showAddForm, setShowAddForm] = useState(false)

  const fetchAlternatives = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await axios.get(`/api/activities/${fromActivityId}/transport-to/${toActivityId}`)
      setAlternatives(response.data)

      // Validate all alternatives
      validateAlternatives(response.data)
    } catch (err) {
      console.error("Error fetching alternatives:", err)
      setError("Failed to load transport alternatives")
    } finally {
      setLoading(false)
    }
  }, [fromActivityId, toActivityId])

  // Fetch alternatives when panel opens
  useEffect(() => {
    if (isOpen && fromActivityId && toActivityId) {
      fetchAlternatives()
    }
  }, [isOpen, fromActivityId, toActivityId, fetchAlternatives])

  const validateAlternatives = async (alts: TransportAlternative[]) => {
    const newValidations: Record<string, ValidationResult> = {}

    await Promise.all(
      alts.map(async (alt) => {
        try {
          const response = await axios.get(`/api/transport-alternatives/${alt.id}/validate`)
          newValidations[alt.id] = response.data
        } catch (err) {
          console.error(`Error validating alternative ${alt.id}:`, err)
        }
      }),
    )

    setValidations(newValidations)
  }

  const handleSelect = async (id: string) => {
    try {
      // First get impact preview
      // setImpactPreview(previewResponse.data) // Removed impactPreview state

      // If no impact or user confirms (simplified for now), select it
      // In a real app, we might show a confirmation dialog if impact is significant

      const response = await axios.post(`/api/transport-alternatives/${id}/select`)

      // If there are schedule updates, apply them
      if (response.data.impact && response.data.impact.affected_activities.length > 0) {
        await axios.post("/api/apply-schedule-updates", {
          updates: response.data.impact.affected_activities,
        })
      }

      onTransportSelected()
      onClose()
    } catch (err) {
      console.error("Error selecting transport:", err)
      setError("Failed to select transport alternative")
    }
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this option?")) return

    try {
      await axios.delete(`/api/transport-alternatives/${id}`)
      fetchAlternatives()
    } catch (err) {
      console.error("Error deleting alternative:", err)
      setError("Failed to delete alternative")
    }
  }

  return (
    <Drawer anchor="right" open={isOpen} onClose={onClose} PaperProps={{ sx: { width: { xs: "100%", sm: 400 } } }}>
      <Box sx={{ p: 2, height: "100%", display: "flex", flexDirection: "column" }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
          <Typography variant="h6">Transport Options</Typography>
          <IconButton onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {showAddForm ? (
          <AddTransportAlternativeForm
            tripId={tripId}
            fromActivityId={fromActivityId}
            toActivityId={toActivityId}
            onSuccess={() => {
              setShowAddForm(false)
              fetchAlternatives()
            }}
            onCancel={() => setShowAddForm(false)}
          />
        ) : (
          <>
            <Box sx={{ flexGrow: 1, overflowY: "auto" }}>
              {loading ? (
                <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
                  <CircularProgress />
                </Box>
              ) : alternatives.length === 0 ? (
                <Box sx={{ textAlign: "center", p: 4, color: "text.secondary" }}>
                  <Typography>No transport options added yet.</Typography>
                  <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    sx={{ mt: 2 }}
                    onClick={() => setShowAddForm(true)}
                  >
                    Add Option
                  </Button>
                </Box>
              ) : (
                alternatives.map((alt) => (
                  <AlternativeCard
                    key={alt.id}
                    alternative={alt}
                    validation={validations[alt.id]}
                    isSelected={alt.is_selected}
                    onSelect={handleSelect}
                    onEdit={() => {}} // TODO: Implement edit
                    onDelete={handleDelete}
                  />
                ))
              )}
            </Box>

            {alternatives.length > 0 && (
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                fullWidth
                sx={{ mt: 2 }}
                onClick={() => setShowAddForm(true)}
              >
                Add Another Option
              </Button>
            )}
          </>
        )}
      </Box>
    </Drawer>
  )
}

export default TransportAlternativesPanel
