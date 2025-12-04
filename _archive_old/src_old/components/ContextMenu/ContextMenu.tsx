import React, { useEffect, useState } from "react"

import { TPosition } from "../../data/types"

import styles from "./ContextMenu.module.css"
import { IMenuOptionsProps, MenuOptionPayload } from "./MenuOption.tsx"

interface IContextMenuProps {
  position: TPosition | null
  onClose?: () => void
  children?: React.ReactNode
  payload?: MenuOptionPayload | null
}

const ContextMenu: React.FC<IContextMenuProps> = ({ position, onClose, children, payload = undefined }) => {
  const [isOpen, setIsOpen] = useState<boolean>(!!position)

  useEffect(() => {
    setIsOpen(!!position)
  }, [position])

  const closeMenu = () => {
    setIsOpen(false)
    onClose?.()
  }

  return isOpen ? (
    <div
      className={styles.contextMenu}
      style={{
        position: "absolute",
        left: position?.x,
        top: position?.y,
      }}
    >
      {React.Children.map(children, (child) =>
        React.cloneElement(child as React.ReactElement<IMenuOptionsProps>, { closeMenu, payload }),
      )}
    </div>
  ) : null
}

export default ContextMenu
