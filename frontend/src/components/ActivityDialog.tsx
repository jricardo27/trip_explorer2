import { Close as CloseIcon } from "@mui/icons-material"
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Alert,
  IconButton,
  Menu,
  MenuItem,
} from "@mui/material"
import React, { useState } from "react"

import { useActivityForm } from "../hooks/useActivityForm"
import { useLanguageStore } from "../stores/languageStore"
import type { Activity, TripDay } from "../types"

import { ActivityBasicFields } from "./ActivityForm/ActivityBasicFields"
import { ActivityCostFields } from "./ActivityForm/ActivityCostFields"
import { ActivityDateTimeFields } from "./ActivityForm/ActivityDateTimeFields"
import { ActivityDetailsFields } from "./ActivityForm/ActivityDetailsFields"
import { ActivityLocationFields } from "./ActivityForm/ActivityLocationFields"
import { ParticipantSelector } from "./ActivityForm/ParticipantSelector"
import LocationPickerMap from "./LocationPickerMap"

interface ActivityDialogProps {
  open: boolean
  onClose: (event?: object, reason?: string) => void
  onSubmit: (data: any) => Promise<void>
  isLoading: boolean
  tripId: string
  tripDayId?: string
  activity?: Activity
  tripStartDate?: string
  tripEndDate?: string
  tripDays?: TripDay[]
  fullScreen?: boolean
  initialCoordinates?: { lat: number; lng: number }
  prefilledCoordinates?: { lat: number; lng: number }
  onCopy?: (activityId: string, asLink?: boolean) => void
  canEdit?: boolean
}

const ActivityDialog = ({
  open,
  onClose,
  onSubmit,
  isLoading,
  tripId,
  tripDayId,
  activity,
  tripStartDate,
  tripEndDate,
  tripDays,
  fullScreen,
  initialCoordinates,
  prefilledCoordinates,
  onCopy,
  canEdit = true,
}: ActivityDialogProps) => {
  const { t } = useLanguageStore()
  const [copyMenuAnchor, setCopyMenuAnchor] = useState<null | HTMLElement>(null)

  const form = useActivityForm({
    open,
    activity,
    tripId,
    tripDayId,
    tripStartDate,
    tripDays,
    initialCoordinates: initialCoordinates || prefilledCoordinates,
    onSubmit,
  })

  const handleClose = (event: object, reason: string) => {
    if (reason === "backdropClick") return
    onClose(event, reason)
  }

  const handleDuplicateClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setCopyMenuAnchor(event.currentTarget)
  }

  const handleCopyAction = (asLink: boolean) => {
    if (activity && onCopy) {
      onCopy(activity.id, asLink)
      setCopyMenuAnchor(null)
      onClose(undefined, "copy")
    }
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth fullScreen={fullScreen}>
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          {activity ? (canEdit ? t("editActivity") : t("viewActivity")) : t("addActivity")}
          {fullScreen && (
            <IconButton onClick={() => onClose(undefined, "closeButton")} size="small">
              <CloseIcon />
            </IconButton>
          )}
        </Box>
      </DialogTitle>
      <DialogContent dividers>
        <form id="activity-form" onSubmit={form.handleFormSubmit}>
          <Box pt={2}>
            {form.error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {form.error}
              </Alert>
            )}
            <Box sx={{ display: "grid", gridTemplateColumns: "repeat(12, 1fr)", gap: 2 }}>
              <ActivityBasicFields
                name={form.name}
                setName={form.setName}
                activityType={form.activityType}
                setActivityType={form.setActivityType}
                priority={form.priority}
                setPriority={form.setPriority}
                canEdit={canEdit}
              />
              <ActivityDateTimeFields
                scheduledStart={form.scheduledStart}
                setScheduledStart={form.setScheduledStart}
                scheduledEnd={form.scheduledEnd}
                setScheduledEnd={form.setScheduledEnd}
                availableDays={form.availableDays}
                setAvailableDays={form.setAvailableDays}
                tripStartDate={tripStartDate}
                tripEndDate={tripEndDate}
                canEdit={canEdit}
              />
              <ActivityCostFields
                estimatedCost={form.estimatedCost}
                setEstimatedCost={form.setEstimatedCost}
                actualCost={form.actualCost}
                setActualCost={form.setActualCost}
                isPaid={form.isPaid}
                setIsPaid={form.setIsPaid}
                isLocked={form.isLocked}
                setIsLocked={form.setIsLocked}
                canEdit={canEdit}
              />
              <ActivityDetailsFields
                notes={form.notes}
                setNotes={form.setNotes}
                phone={form.phone}
                setPhone={form.setPhone}
                email={form.email}
                setEmail={form.setEmail}
                website={form.website}
                setWebsite={form.setWebsite}
                openingHours={form.openingHours}
                setOpeningHours={form.setOpeningHours}
                canEdit={canEdit}
              />
              <ActivityLocationFields
                latitude={form.latitude}
                setLatitude={form.setLatitude}
                longitude={form.longitude}
                setLongitude={form.setLongitude}
                setMapPickerOpen={form.setMapPickerOpen}
                canEdit={canEdit}
              />
              <ParticipantSelector
                members={form.members}
                selectedMemberIds={form.selectedMemberIds}
                handleToggleMember={form.handleToggleMember}
                canEdit={canEdit}
              />
            </Box>
          </Box>
        </form>
      </DialogContent>
      <DialogActions sx={{ justifyContent: "space-between", px: 3, pb: 2 }}>
        <Box>
          {activity && onCopy && (
            <>
              <Button onClick={handleDuplicateClick} color="inherit">
                {t("duplicate")}
              </Button>
              <Menu anchorEl={copyMenuAnchor} open={Boolean(copyMenuAnchor)} onClose={() => setCopyMenuAnchor(null)}>
                <MenuItem onClick={() => handleCopyAction(false)}>{t("copyActivity")}</MenuItem>
                <MenuItem onClick={() => handleCopyAction(true)}>{t("copyActivityAsLink")}</MenuItem>
              </Menu>
            </>
          )}
        </Box>
        <Box>
          <Button onClick={() => onClose(undefined, "cancelButton")} sx={{ mr: 1 }}>
            {t("cancel")}
          </Button>
          {canEdit && (
            <Button type="submit" form="activity-form" variant="contained" disabled={isLoading}>
              {isLoading ? t("saving") + "..." : activity ? t("saveChanges") : t("addActivity")}
            </Button>
          )}
        </Box>
      </DialogActions>
      <LocationPickerMap
        open={form.mapPickerOpen}
        onClose={() => form.setMapPickerOpen(false)}
        initialLat={form.latitude ? parseFloat(form.latitude) : undefined}
        initialLng={form.longitude ? parseFloat(form.longitude) : undefined}
        onSelect={(lat, lng) => {
          form.setLatitude(lat.toString())
          form.setLongitude(lng.toString())
        }}
        readOnly={!canEdit}
      />
    </Dialog>
  )
}

export default ActivityDialog
