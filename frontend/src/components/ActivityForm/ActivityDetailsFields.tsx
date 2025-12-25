import { Grid, TextField } from "@mui/material"

import { useLanguageStore } from "../../stores/languageStore"

interface ActivityDetailsFieldsProps {
  notes: string
  setNotes: (notes: string) => void
  phone: string
  setPhone: (phone: string) => void
  email: string
  setEmail: (email: string) => void
  website: string
  setWebsite: (website: string) => void
  openingHours: string
  setOpeningHours: (hours: string) => void
  canEdit: boolean
}

export const ActivityDetailsFields = ({
  notes,
  setNotes,
  phone,
  setPhone,
  email,
  setEmail,
  website,
  setWebsite,
  openingHours,
  setOpeningHours,
  canEdit,
}: ActivityDetailsFieldsProps) => {
  const { t } = useLanguageStore()

  return (
    <>
      <Grid size={{ xs: 6 }}>
        <TextField
          fullWidth
          label={t("phone")}
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          disabled={!canEdit}
        />
      </Grid>
      <Grid size={{ xs: 6 }}>
        <TextField
          fullWidth
          label={t("email")}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={!canEdit}
        />
      </Grid>
      <Grid size={{ xs: 12 }}>
        <TextField
          fullWidth
          label={t("website")}
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
          disabled={!canEdit}
        />
      </Grid>
      <Grid size={{ xs: 12 }}>
        <TextField
          fullWidth
          label={t("openingHours") + " (JSON)"}
          value={openingHours}
          onChange={(e) => setOpeningHours(e.target.value)}
          multiline
          rows={3}
          disabled={!canEdit}
          placeholder='{"monday": "9:00-17:00"}'
        />
      </Grid>
      <Grid size={{ xs: 12 }}>
        <TextField
          fullWidth
          label={t("activityNotes")}
          multiline
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          disabled={!canEdit}
        />
      </Grid>
    </>
  )
}
