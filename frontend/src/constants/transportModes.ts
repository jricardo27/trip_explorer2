import { FaPerson } from "react-icons/fa6"
import {
  MdDirectionsCar,
  MdFlight,
  MdDirectionsWalk,
  MdDirectionsBike,
  MdDirectionsBus,
  MdDirectionsBoat,
  MdTrain,
} from "react-icons/md"

/**
 * Get icon component for transport mode
 */
export function getTransportIconComponent(mode?: string) {
  if (!mode) return null

  const modeLower = mode.toLowerCase()

  if (modeLower.includes("car") || modeLower.includes("drive")) return MdDirectionsCar
  if (modeLower.includes("flight") || modeLower.includes("plane") || modeLower.includes("air")) return MdFlight
  if (modeLower.includes("walk")) return MdDirectionsWalk
  if (modeLower.includes("bike") || modeLower.includes("bicycle")) return MdDirectionsBike
  if (modeLower.includes("bus")) return MdDirectionsBus
  if (modeLower.includes("boat") || modeLower.includes("ferry")) return MdDirectionsBoat
  if (modeLower.includes("train") || modeLower.includes("rail")) return MdTrain

  return null
}

/**
 * Get travel icon for default animation icon
 */
export function getTravelIcon(iconType: string) {
  switch (iconType) {
    case "person":
    default:
      return FaPerson
  }
}
