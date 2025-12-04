import { IconType } from "react-icons"
import {
  MdPerson,
  MdDirectionsCar,
  MdFlight,
  MdTrain,
  MdDirectionsBus,
  MdDirectionsBike,
  MdDirectionsWalk,
  MdDirectionsBoat,
  MdDirectionsSubway,
  MdLocalTaxi,
  MdTram,
  MdDirectionsRun,
} from "react-icons/md"

export interface TravelIconOption {
  id: string
  label: string
  icon: IconType
}

export const TRAVEL_ICON_OPTIONS: TravelIconOption[] = [
  { id: "person", label: "Person", icon: MdPerson },
  { id: "car", label: "Car", icon: MdDirectionsCar },
  { id: "plane", label: "Plane", icon: MdFlight },
  { id: "train", label: "Train", icon: MdTrain },
  { id: "bus", label: "Bus", icon: MdDirectionsBus },
  { id: "bike", label: "Bike", icon: MdDirectionsBike },
  { id: "walk", label: "Walk", icon: MdDirectionsWalk },
  { id: "boat", label: "Boat", icon: MdDirectionsBoat },
  { id: "subway", label: "Subway", icon: MdDirectionsSubway },
  { id: "taxi", label: "Taxi", icon: MdLocalTaxi },
  { id: "run", label: "Run", icon: MdDirectionsRun },
  { id: "tram", label: "Tram", icon: MdTram },
]

export const getTravelIcon = (iconId?: string): IconType => {
  const option = TRAVEL_ICON_OPTIONS.find((opt) => opt.id === iconId)
  return option?.icon || MdPerson
}
