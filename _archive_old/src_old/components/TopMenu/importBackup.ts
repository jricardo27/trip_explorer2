import JSZip from "jszip"

import { SavedFeaturesStateType, setSavedFeaturesType } from "../../contexts/SavedFeaturesContext.ts"

const handleFileImport = async (
  file: File,
  importMode: "override" | "append" | "merge",
  setSavedFeatures: setSavedFeaturesType,
) => {
  try {
    const fileExtension = file.name.split(".").pop()?.toLowerCase()

    if (fileExtension === "zip") {
      const zip = new JSZip()
      const zipData = await zip.loadAsync(file)
      const jsonFile = Object.values(zipData.files).find((file) => file.name.endsWith(".json"))
      if (jsonFile) {
        const jsonData = await jsonFile.async("string")
        const importedData: SavedFeaturesStateType = JSON.parse(jsonData)

        if (importMode === "override") {
          setSavedFeatures(importedData)
        } else if (importMode === "append") {
          setSavedFeatures(
            (prevSavedFeatures: SavedFeaturesStateType) =>
              Object.assign({}, prevSavedFeatures, importedData) as SavedFeaturesStateType,
          )
        } else if (importMode === "merge") {
          setSavedFeatures((prevSavedFeatures: SavedFeaturesStateType) => {
            const mergedFeatures = { ...prevSavedFeatures }
            for (const category in importedData) {
              if (mergedFeatures[category]) {
                mergedFeatures[category] = [...new Set([...mergedFeatures[category], ...importedData[category]])]
              } else {
                mergedFeatures[category] = importedData[category]
              }
            }
            return mergedFeatures
          })
        }
      }
    } else if (fileExtension === "geojson") {
      console.log("Not supported yet")
    }
  } catch (error) {
    console.error(error)
  }
}

export const importBackup = (importMode: "override" | "append" | "merge", setSavedFeatures: setSavedFeaturesType) => {
  const input = document.createElement("input")
  input.type = "file"
  input.accept = ".zip"
  input.onchange = (event: Event) => {
    const target = event.target as HTMLInputElement

    if (target.files && target.files.length > 0) {
      handleFileImport(target.files[0], importMode, setSavedFeatures)
    }
  }
  input.click()
}
