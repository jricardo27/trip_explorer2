import {
  MdDirectionsCar,
  MdDirectionsBus,
  MdTrain,
  MdFlight,
  MdDirectionsWalk,
  MdDirectionsBike,
  MdDirectionsBoat,
} from "react-icons/md"

export enum TransportMode {
  Car = "Car",
  Bus = "Bus",
  Train = "Train",
  Flight = "Flight",
  Walk = "Walk",
  Bike = "Bike",
  Boat = "Boat",
}

export const TRANSPORT_MODES = [
  { id: TransportMode.Car, label: "Car", icon: MdDirectionsCar },
  { id: TransportMode.Bus, label: "Bus", icon: MdDirectionsBus },
  { id: TransportMode.Train, label: "Train", icon: MdTrain },
  { id: TransportMode.Flight, label: "Flight", icon: MdFlight },
  { id: TransportMode.Walk, label: "Walk", icon: MdDirectionsWalk },
  { id: TransportMode.Bike, label: "Bike", icon: MdDirectionsBike },
  { id: TransportMode.Boat, label: "Boat", icon: MdDirectionsBoat },
]

export const getTransportIconComponent = (mode: string | undefined | null) => {
  if (!mode) return null
  const found = TRANSPORT_MODES.find(
    (m) => m.id.toLowerCase() === mode.toLowerCase() || m.label.toLowerCase() === mode.toLowerCase(),
  )
  return found ? found.icon : null
}
