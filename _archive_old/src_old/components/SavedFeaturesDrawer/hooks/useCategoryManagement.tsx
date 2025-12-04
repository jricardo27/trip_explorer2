import { arrayMove } from "@dnd-kit/sortable"
import { useCallback } from "react"

import { DEFAULT_CATEGORY, SavedFeaturesStateType } from "../../../contexts/SavedFeaturesContext"

interface UseCategoryManagement {
  moveCategory: (direction: "up" | "down") => void
  handleRenameCategory: (newName: string) => void
  handleAddCategory: () => void
  handleRemoveCategory: () => void
}

export const useCategoryManagement = (
  setSavedFeatures: {
    (newState: SavedFeaturesStateType): void
    (updater: (prev: SavedFeaturesStateType) => SavedFeaturesStateType): void
  },
  setSelectedTab: (newState: string) => void,
  savedFeatures: SavedFeaturesStateType,
  contextMenuTab: string | null,
): UseCategoryManagement => {
  const moveCategory = useCallback(
    (direction: "up" | "down") => {
      if (!contextMenuTab || contextMenuTab === DEFAULT_CATEGORY) return

      const keys = Object.keys(savedFeatures)
      const index = keys.indexOf(contextMenuTab)

      if (index === -1) return

      let newIndex
      if (direction === "up" && index > 1) {
        newIndex = index - 1
      } else if (direction === "down" && index < keys.length - 1) {
        newIndex = index + 1
      } else {
        return // Can't move further up/down
      }

      const newOrder = arrayMove(keys, index, newIndex)
      const newSavedFeatures = Object.fromEntries(newOrder.map((key) => [key, savedFeatures[key]]))
      setSavedFeatures(newSavedFeatures)
    },
    [contextMenuTab, savedFeatures, setSavedFeatures],
  )

  const handleRenameCategory = useCallback(
    (newName: string) => {
      if (contextMenuTab && contextMenuTab !== DEFAULT_CATEGORY && newName !== DEFAULT_CATEGORY) {
        setSavedFeatures((prev: SavedFeaturesStateType) => {
          const newSavedFeatures = { ...prev }
          newSavedFeatures[newName] = newSavedFeatures[contextMenuTab]
          delete newSavedFeatures[contextMenuTab]
          const keys = Object.keys(newSavedFeatures)
          const index = keys.indexOf(contextMenuTab)
          if (index !== -1) keys.splice(index, 1, newName)
          return Object.fromEntries(keys.map((key) => [key, newSavedFeatures[key]]))
        })
      }
    },
    [contextMenuTab, setSavedFeatures],
  )

  const handleAddCategory = useCallback(() => {
    let categoryName = prompt("Enter name for category")

    if (!categoryName || Object.keys(savedFeatures).includes(categoryName)) {
      categoryName = `Category_${Object.keys(savedFeatures).length}`
    }

    setSavedFeatures((prev: SavedFeaturesStateType) => ({
      ...prev,
      [categoryName]: [],
    }))
  }, [savedFeatures, setSavedFeatures])

  const handleRemoveCategory = useCallback(() => {
    if (contextMenuTab && contextMenuTab !== DEFAULT_CATEGORY) {
      setSavedFeatures((prev: SavedFeaturesStateType) => {
        const featuresToMove = prev[contextMenuTab]
        const newSavedFeatures = { ...prev }
        delete newSavedFeatures[contextMenuTab]
        newSavedFeatures[DEFAULT_CATEGORY] = [...newSavedFeatures[DEFAULT_CATEGORY], ...featuresToMove]
        return newSavedFeatures
      })

      const tabs = Object.keys(savedFeatures)
      const indexToDelete = tabs.indexOf(contextMenuTab)
      const previousTab = tabs[indexToDelete - 1]
      setSelectedTab(previousTab)
    }
  }, [contextMenuTab, setSavedFeatures, setSelectedTab, savedFeatures])

  return {
    moveCategory,
    handleRenameCategory,
    handleAddCategory,
    handleRemoveCategory,
  }
}
