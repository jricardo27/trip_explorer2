import { useState, useEffect } from "react"

import type { TripAnimation } from "../types"

interface UseMapAnimationProps {
  animations?: TripAnimation[]
  selectedAnimationId?: string
  onSaveAnimation?: (animation: Partial<TripAnimation>) => Promise<void>
  onDeleteAnimation?: (id: string) => Promise<void>
}

export const useMapAnimation = ({
  animations = [],
  selectedAnimationId,
  onSaveAnimation,
  onDeleteAnimation,
}: UseMapAnimationProps) => {
  const [isPlaying, setIsPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [isSaving, setIsSaving] = useState(false)
  const [resetKey, setResetKey] = useState(0)

  const currentAnimation = animations.find((a) => a.id === selectedAnimationId)

  const [settings, setSettings] = useState({
    name: currentAnimation?.name || "",
    transitionDuration: currentAnimation?.settings?.transitionDuration || 1.5,
    stayDuration: currentAnimation?.settings?.stayDuration || 2.0,
    speedFactor: currentAnimation?.settings?.speedFactor || 200,
    speed: currentAnimation?.settings?.speed || 1,
    loop: currentAnimation?.settings?.loop || false,
    showMarkers: currentAnimation?.settings?.showMarkers ?? true,
    showLines: currentAnimation?.settings?.showLines ?? true,
    interpolation: currentAnimation?.settings?.interpolation || "linear",
  })

  useEffect(() => {
    if (currentAnimation) {
      setSettings({
        name: currentAnimation.name || "",
        transitionDuration: currentAnimation.settings?.transitionDuration || 1.5,
        stayDuration: currentAnimation.settings?.stayDuration || 2.0,
        speedFactor: currentAnimation.settings?.speedFactor || 200,
        speed: currentAnimation.settings?.speed || 1,
        loop: currentAnimation.settings?.loop || false,
        showMarkers: currentAnimation.settings?.showMarkers ?? true,
        showLines: currentAnimation.settings?.showLines ?? true,
        interpolation: currentAnimation.settings?.interpolation || "linear",
      })
    }
  }, [currentAnimation])

  // Note: Progress is now controlled by TripAnimationLayer via onProgressUpdate callback
  // No need for independent timer here

  const handlePlayPause = () => setIsPlaying(!isPlaying)
  const handleReset = () => {
    setIsPlaying(false)
    setProgress(0)
    setResetKey((prev) => prev + 1)
  }

  const handleSave = async (name: string) => {
    if (!onSaveAnimation || !selectedAnimationId) return
    setIsSaving(true)
    try {
      await onSaveAnimation({
        id: selectedAnimationId,
        name,
        settings: {
          transitionDuration: settings.transitionDuration,
          stayDuration: settings.stayDuration,
          speedFactor: settings.speedFactor,
          speed: settings.speed,
          loop: settings.loop,
          showMarkers: settings.showMarkers,
          showLines: settings.showLines,
          interpolation: settings.interpolation,
        },
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!onDeleteAnimation || !selectedAnimationId) return
    if (!window.confirm("Are you sure you want to delete this animation?")) return
    try {
      await onDeleteAnimation(selectedAnimationId)
    } catch (err) {
      console.error("Failed to delete animation", err)
    }
  }

  return {
    isPlaying,
    setIsPlaying,
    progress,
    setProgress,
    settings,
    setSettings,
    currentAnimation,
    isSaving,
    handlePlayPause,
    handleReset,
    handleSave,
    handleDelete,
    resetKey,
  }
}
