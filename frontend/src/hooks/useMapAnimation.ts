import { useState, useRef, useEffect, useCallback } from "react"

import type { TripAnimation } from "../types"

interface UseMapAnimationProps {
  animations?: TripAnimation[]
  onSaveAnimation?: (animation: Partial<TripAnimation>) => Promise<void>
  onDeleteAnimation?: (id: string) => Promise<void>
}

export const useMapAnimation = ({ animations = [], onSaveAnimation, onDeleteAnimation }: UseMapAnimationProps) => {
  const [isPlaying, setIsPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [currentAnimationId, setCurrentAnimationId] = useState<string | undefined>(
    animations.length > 0 ? animations[0].id : undefined,
  )
  const [isSaving, setIsSaving] = useState(false)

  const currentAnimation = animations.find((a) => a.id === currentAnimationId)

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

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const resetTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [])

  useEffect(() => {
    if (isPlaying) {
      const step = (settings.speedFactor / 1000) * 0.1 // Adjusted based on speedFactor
      timerRef.current = setInterval(() => {
        setProgress((prev) => {
          const next = prev + step
          if (next >= 1) {
            if (settings.loop) return 0
            setIsPlaying(false)
            resetTimer()
            return 1
          }
          return next
        })
      }, 50)
    } else {
      resetTimer()
    }
    return () => resetTimer()
  }, [isPlaying, settings.speedFactor, settings.loop, resetTimer])

  const handlePlayPause = () => setIsPlaying(!isPlaying)
  const handleReset = () => {
    setIsPlaying(false)
    setProgress(0)
  }

  const handleSave = async (name: string) => {
    if (!onSaveAnimation) return
    setIsSaving(true)
    try {
      await onSaveAnimation({
        id: currentAnimationId,
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
    if (!onDeleteAnimation || !currentAnimationId) return
    if (!window.confirm("Are you sure you want to delete this animation?")) return
    try {
      await onDeleteAnimation(currentAnimationId)
      setCurrentAnimationId(animations.length > 0 ? animations[0].id : undefined)
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
    currentAnimationId,
    setCurrentAnimationId,
    currentAnimation,
    isSaving,
    handlePlayPause,
    handleReset,
    handleSave,
    handleDelete,
  }
}
