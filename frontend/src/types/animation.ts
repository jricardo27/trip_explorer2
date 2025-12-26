export interface AnimationSettings {
  transitionDuration?: number
  stayDuration?: number
  speedFactor?: number
  speed?: number
  loop?: boolean
  showMarkers?: boolean
  showLines?: boolean
  interpolation?: "linear" | "smooth"
  titleDisplayMode?: "hide" | "duration" | "always"
  titleDisplayDuration?: number // in seconds, default 5
}

export type TripAnimation = {
  id: string
  tripId: string
  name: string
  description?: string
  settings: any
  steps: TripAnimationStep[]
  createdAt: string
  updatedAt: string
}

export interface TripAnimationStep {
  id: string
  animationId: string
  activityId?: string
  orderIndex: number
  isVisible: boolean
  customLabel?: string
  zoomLevel?: number
  transportMode?: string
  settings: any
  activity?: any // Avoid circular dependency with Activity for now
}
