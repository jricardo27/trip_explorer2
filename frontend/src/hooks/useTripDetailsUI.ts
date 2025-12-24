import { useState } from "react"
import { useSearchParams } from "react-router-dom"

import type { Activity } from "../types"

export const useTripDetailsUI = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const viewMode = (searchParams.get("view") as any) || "list"

  const [dialogOpen, setDialogOpen] = useState(false)
  const [membersDialogOpen, setMembersDialogOpen] = useState(false)
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false)
  const [selectedDayId, setSelectedDayId] = useState<string | undefined>(undefined)
  const [editingActivity, setEditingActivity] = useState<Activity | undefined>(undefined)
  const [collapsedDays, setCollapsedDays] = useState<Set<string>>(new Set())
  const [activeFlyToLocation, setActiveFlyToLocation] = useState<{ lat: number; lng: number; _ts?: number } | null>(
    null,
  )
  const [mapExpanded, setMapExpanded] = useState(false)
  const [initialCoordinates, setInitialCoordinates] = useState<{ lat: number; lng: number } | undefined>(undefined)

  const handleViewModeChange = (_: React.SyntheticEvent, newMode: any) => {
    setSearchParams({ view: newMode })
  }

  const toggleDayCollapse = (dayId: string) => {
    setCollapsedDays((prev) => {
      const next = new Set(prev)
      if (next.has(dayId)) next.delete(dayId)
      else next.add(dayId)
      return next
    })
  }

  const handleAddActivity = (dayId?: string, coordinates?: { lat: number; lng: number }) => {
    setSelectedDayId(dayId)
    setInitialCoordinates(coordinates)
    setEditingActivity(undefined)
    setDialogOpen(true)
  }

  const handleEditActivity = (activity: Activity) => {
    setEditingActivity(activity)
    setDialogOpen(true)
  }

  return {
    viewMode,
    handleViewModeChange,
    dialogOpen,
    setDialogOpen,
    membersDialogOpen,
    setMembersDialogOpen,
    settingsDialogOpen,
    setSettingsDialogOpen,
    selectedDayId,
    editingActivity,
    collapsedDays,
    toggleDayCollapse,
    activeFlyToLocation,
    setActiveFlyToLocation,
    mapExpanded,
    setMapExpanded,
    initialCoordinates,
    handleAddActivity,
    handleEditActivity,
  }
}
