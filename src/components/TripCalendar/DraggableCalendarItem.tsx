import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import React from "react"

import { DayLocation, TripFeature } from "../../contexts/TripContext"

import { CalendarItem } from "./CalendarItem"

interface DraggableCalendarItemProps {
  item: DayLocation | TripFeature
  itemId: string
  dayId: string
  onClick: () => void
}

export const DraggableCalendarItem: React.FC<DraggableCalendarItemProps> = ({ item, itemId, dayId, onClick }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: itemId,
    data: { item, dayId, itemId },
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <CalendarItem item={item} onClick={onClick} isDragging={isDragging} />
    </div>
  )
}
