import React, { useState, useCallback, useEffect } from "react"

import { GeoJsonFeature } from "../data/types"
import idxFeat, { idxSel } from "../utils/idxFeat"

import SavedFeaturesContext, { SavedFeaturesContextType, SavedFeaturesStateType, selectionInfo } from "./SavedFeaturesContext"

interface SavedFeaturesProviderProps {
  children: React.ReactNode
}

const SavedFeaturesProvider: React.FC<SavedFeaturesProviderProps> = ({ children }) => {
  const [savedFeatures, setSavedFeaturesState] = useState<SavedFeaturesStateType>({ all: [] })
  const [userId, setUserId] = useState<string>("")
  const [email, setEmail] = useState<string | null>(localStorage.getItem("userEmail"))

  // Initialize User ID
  useEffect(() => {
    let id = localStorage.getItem("userId")
    if (!id) {
      id = crypto.randomUUID()
      localStorage.setItem("userId", id)
    }
    setUserId(id)
  }, [])

  const API_URL = import.meta.env.VITE_API_URL || ""

  // Load features from API
  const loadFromApi = useCallback(async () => {
    if (!userId) return
    try {
      const response = await fetch(`${API_URL}/api/features?user_id=${userId}`)
      if (response.ok) {
        const data = await response.json()
        setSavedFeaturesState({ all: [], ...data })
      }
    } catch (error) {
      console.error("Failed to load features:", error)
    }
  }, [userId, API_URL])

  // Initial load
  useEffect(() => {
    loadFromApi()
  }, [loadFromApi])

  const setSavedFeatures = useCallback((arg: SavedFeaturesStateType | ((prev: SavedFeaturesStateType) => SavedFeaturesStateType)) => {
    if (typeof arg === "function") {
      setSavedFeaturesState((prevState: SavedFeaturesStateType) => arg(prevState))
    } else {
      setSavedFeaturesState(arg)
    }
  }, [setSavedFeaturesState])

  const addFeature = useCallback(async (listName: string, feature: GeoJsonFeature) => {
    if (!feature || !userId) return

    try {
      await fetch(`${API_URL}/api/features`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, list_name: listName, feature }),
      })

      // Optimistic update or reload
      loadFromApi()
    } catch (error) {
      console.error("Failed to save feature:", error)
    }
  }, [userId, loadFromApi, API_URL])

  const removeFeature = useCallback(async (listName: string, selection: selectionInfo | null) => {
    if (!selection || !userId) {
      console.error("No selection info or user ID")
      return
    }

    // We need the feature ID to remove it.
    // The current selectionInfo might be an index or ID.
    // Assuming we can find the feature in the current state to get its ID.
    const featureToRemove = savedFeatures[listName]?.find((f: GeoJsonFeature, index: number) => idxFeat(index, f) === idxSel(selection))

    if (!featureToRemove?.properties?.id) {
      console.error("Could not find feature ID to remove")
      return
    }

    try {
      await fetch(`${API_URL}/api/features`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, list_name: listName, feature_id: featureToRemove.properties.id }),
      })
      loadFromApi()
    } catch (error) {
      console.error("Failed to remove feature:", error)
    }
  }, [userId, savedFeatures, loadFromApi, API_URL])

  const updateFeature = useCallback(async (_oldFeature: GeoJsonFeature, newFeature: GeoJsonFeature) => {
    if (!userId) return

    try {
      await fetch(`${API_URL}/api/features`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, feature: newFeature }),
      })
      loadFromApi()
    } catch (error) {
      console.error("Failed to update feature:", error)
    }
  }, [userId, loadFromApi, API_URL])

  const contextValue: SavedFeaturesContextType = {
    savedFeatures,
    addFeature,
    removeFeature,
    updateFeature,
    setSavedFeatures,
    saveToLocalStorage: () => { }, // No-op for compatibility
    loadFromLocalStorage: loadFromApi, // Mapped to API load
    userId,
    setUserId: (id: string) => {
      localStorage.setItem("userId", id)
      setUserId(id)
    },
    email: email,
    login: (newEmail: string, newId: string) => {
      setEmail(newEmail)
      setUserId(newId)
      localStorage.setItem("userEmail", newEmail)
      localStorage.setItem("userId", newId)
    },
    logout: () => {
      setEmail(null)
      localStorage.removeItem("userEmail")
      // Generate new guest ID
      const newId = crypto.randomUUID()
      setUserId(newId)
      localStorage.setItem("userId", newId)
    },
  }

  return (
    <SavedFeaturesContext.Provider value={contextValue}>
      {children}
    </SavedFeaturesContext.Provider>
  )
}

export default SavedFeaturesProvider
