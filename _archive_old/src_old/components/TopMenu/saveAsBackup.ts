import FileSaver from "file-saver"
import JSZip from "jszip"

import { SavedFeaturesStateType } from "../../contexts/SavedFeaturesContext.ts"

export const saveAsBackup = async (savedFeatures: SavedFeaturesStateType) => {
  const zip = new JSZip()
  zip.file("trip_explorer_backup.json", JSON.stringify(savedFeatures, null, 2))

  const zipBlob = await zip.generateAsync({ type: "blob" })

  FileSaver.saveAs(zipBlob, "trip_explorer_backup.zip")
}
