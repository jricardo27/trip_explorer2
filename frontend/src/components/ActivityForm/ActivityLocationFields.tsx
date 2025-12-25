import { Map as MapIcon } from "@mui/icons-material"
import { Grid, TextField, Button } from "@mui/material"

import { useLanguageStore } from "../../stores/languageStore"

interface ActivityLocationFieldsProps {
  latitude: string
  setLatitude: (lat: string) => void
  longitude: string
  setLongitude: (lng: string) => void
  setMapPickerOpen: (open: boolean) => void
  canEdit: boolean
}

export const ActivityLocationFields = ({
  latitude,
  setLatitude,
  longitude,
  setLongitude,
  setMapPickerOpen,
  canEdit,
}: ActivityLocationFieldsProps) => {
  const { t } = useLanguageStore()

  return (
    <>
      <Grid size={{ xs: 6 }}>
        <TextField
          fullWidth
          label={t("latitude")}
          type="number"
          value={latitude}
          onChange={(e) => setLatitude(e.target.value)}
          inputProps={{ step: "any" }}
          disabled={!canEdit}
        />
      </Grid>
      <Grid size={{ xs: 6 }}>
        <TextField
          fullWidth
          label={t("longitude")}
          type="number"
          value={longitude}
          onChange={(e) => setLongitude(e.target.value)}
          inputProps={{ step: "any" }}
          disabled={!canEdit}
        />
      </Grid>
      <Grid size={{ xs: 12 }}>
        <Button
          variant="outlined"
          fullWidth
          onClick={() => setMapPickerOpen(true)}
          sx={{ height: 56 }}
          title={t("selectFromMap")}
          disabled={!canEdit}
        >
          <MapIcon />
        </Button>
      </Grid>
    </>
  )
}
