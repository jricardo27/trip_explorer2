import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle } from "@mui/material"

import { useLanguageStore } from "../stores/languageStore"

interface ConfirmDialogProps {
  open: boolean
  title: string
  content: string
  onConfirm: () => void
  onClose: () => void
  confirmLabel?: string
  cancelLabel?: string
  isDestructive?: boolean
}

export const ConfirmDialog = ({
  open,
  title,
  content,
  onConfirm,
  onClose,
  confirmLabel,
  cancelLabel,
  isDestructive = false,
}: ConfirmDialogProps) => {
  const { t } = useLanguageStore()

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <DialogContentText>{content}</DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="inherit">
          {cancelLabel || t("cancel") || "Cancel"}
        </Button>
        <Button
          onClick={() => {
            onConfirm()
            onClose()
          }}
          color={isDestructive ? "error" : "primary"}
          autoFocus
        >
          {confirmLabel || t("confirm") || "Confirm"}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
