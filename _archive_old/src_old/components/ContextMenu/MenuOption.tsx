import React from "react"

import { TCoordinate } from "../../data/types" // Import CSS Module

import styles from "./ContextMenu.module.css"

export interface MenuOptionPayload {
  coordinates: TCoordinate
}

export interface IMenuOptionsProps {
  title: string
  handler: (arg0: MenuOptionPayload) => void
  closeMenu?: () => void
  payload?: MenuOptionPayload | null
}

const MenuOption = ({ ...props }: IMenuOptionsProps): React.ReactNode => {
  const handleClick = (event: React.MouseEvent) => {
    event.stopPropagation()
    if (props.payload) {
      props.handler(props.payload)
    }

    if (props.closeMenu) {
      props.closeMenu()
    }
  }

  return (
    <div className={styles.contextMenuItem} onClick={handleClick}>
      {props.title}
    </div>
  )
}

export default MenuOption
