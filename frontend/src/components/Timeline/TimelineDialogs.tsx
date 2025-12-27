import {
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControl,
  InputLabel,
  Select,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
  Box,
} from "@mui/material"
import dayjs from "dayjs"

import { useLanguageStore } from "../../stores/languageStore"
import type { TripDay } from "../../types"
import type { DayCostResult } from "../../utils/costUtils"

interface DayOperationDialogProps {
  open: boolean
  onClose: () => void
  type: "move_all" | "swap" | "rename" | null
  dayId: string
  targetDayId: string
  setTargetDayId: (id: string) => void
  newName: string
  setNewName: (name: string) => void
  days: TripDay[]
  onSubmit: () => void
}

export const DayOperationDialog = ({
  open,
  onClose,
  type,
  dayId,
  targetDayId,
  setTargetDayId,
  newName,
  setNewName,
  days,
  onSubmit,
}: DayOperationDialogProps) => {
  const { t } = useLanguageStore()

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>
        {type === "move_all" && t("moveAllActivities")}
        {type === "swap" && t("swapDays")}
        {type === "rename" && t("renameDay")}
      </DialogTitle>
      <DialogContent sx={{ minWidth: 300, pt: 2 }}>
        {type === "rename" ? (
          <FormControl fullWidth sx={{ mt: 2 }}>
            <TextField
              autoFocus
              label={t("dayName")}
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              fullWidth
            />
          </FormControl>
        ) : (
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel>{t("targetDay")}</InputLabel>
            <Select value={targetDayId} label={t("targetDay")} onChange={(e) => setTargetDayId(e.target.value)}>
              {days
                .filter((d) => d.id !== dayId)
                .map((d) => (
                  <MenuItem key={d.id} value={d.id}>
                    {d.name || `Day ${d.dayIndex !== undefined ? d.dayIndex + 1 : "?"}`} (
                    {dayjs(d.date).format("MMM D")})
                  </MenuItem>
                ))}
            </Select>
          </FormControl>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t("cancel")}</Button>
        <Button onClick={onSubmit} variant="contained">
          {t("confirm")}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

interface ScenarioDialogProps {
  open: boolean
  onClose: () => void
  mode: "create" | "rename"
  name: string
  setName: (name: string) => void
  onSubmit: () => void
}

export const ScenarioDialog = ({ open, onClose, mode, name, setName, onSubmit }: ScenarioDialogProps) => {
  const { t } = useLanguageStore()

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>{mode === "create" ? t("createAlternative") : t("renameScenario")}</DialogTitle>
      <DialogContent sx={{ minWidth: 300, pt: 2 }}>
        <FormControl fullWidth sx={{ mt: 2 }}>
          <TextField
            autoFocus
            label={t("scenarioName")}
            value={name}
            onChange={(e) => setName(e.target.value)}
            fullWidth
          />
        </FormControl>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t("cancel")}</Button>
        <Button onClick={onSubmit} variant="contained">
          {t("confirm")}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

interface TimelineContextMenuProps {
  anchorEl: { mouseX: number; mouseY: number } | null
  onClose: () => void
  onAddActivity: () => void
  onCopyActivity: (asLink: boolean) => void
  isActivity: boolean
}

export const TimelineContextMenu = ({
  anchorEl,
  onClose,
  onAddActivity,
  onCopyActivity,
  isActivity,
}: TimelineContextMenuProps) => {
  const { t } = useLanguageStore()

  return (
    <Menu
      open={anchorEl !== null}
      onClose={onClose}
      anchorReference="anchorPosition"
      anchorPosition={anchorEl !== null ? { top: anchorEl.mouseY, left: anchorEl.mouseX } : undefined}
    >
      {!isActivity && (
        <MenuItem
          onClick={() => {
            onAddActivity()
            onClose()
          }}
        >
          {t("addActivityHere" as any)}
        </MenuItem>
      )}
      {isActivity && (
        <MenuItem
          onClick={() => {
            onCopyActivity(false)
            onClose()
          }}
        >
          {t("copyActivity" as any)}
        </MenuItem>
      )}
      {isActivity && (
        <MenuItem
          onClick={() => {
            onCopyActivity(true)
            onClose()
          }}
        >
          {t("copyAsLink" as any)}
        </MenuItem>
      )}
    </Menu>
  )
}

interface DayOptionsMenuProps {
  anchorEl: HTMLElement | null
  open: boolean
  onClose: () => void
  onOperation: (type: "move_all" | "swap" | "rename") => void
}

export const DayOptionsMenu = ({ anchorEl, open, onClose, onOperation }: DayOptionsMenuProps) => {
  const { t } = useLanguageStore()

  return (
    <Menu anchorEl={anchorEl} open={open} onClose={onClose}>
      <MenuItem
        onClick={() => {
          onOperation("move_all")
          onClose()
        }}
      >
        {t("moveAllActivities" as any) + "..."}
      </MenuItem>
      <MenuItem
        onClick={() => {
          onOperation("swap")
          onClose()
        }}
      >
        {t("swapDays" as any) + "..."}
      </MenuItem>
      <MenuItem
        onClick={() => {
          onOperation("rename")
          onClose()
        }}
      ></MenuItem>
    </Menu>
  )
}

interface CostBreakdownDialogProps {
  open: boolean
  onClose: () => void
  costResult: DayCostResult
  baseCurrency: string
}

export const CostBreakdownDialog = ({ open, onClose, costResult, baseCurrency }: CostBreakdownDialogProps) => {
  const { t } = useLanguageStore()

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{t("costBreakdown" as any) || "Cost Breakdown"}</DialogTitle>
      <DialogContent>
        <Table size="small" sx={{ mt: 1 }}>
          <TableHead>
            <TableRow>
              <TableCell>{t("currency" as any)}</TableCell>
              <TableCell align="right">{t("amount" as any)}</TableCell>
              <TableCell align="right">{baseCurrency}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {Object.entries(costResult.breakdown).map(([currency, data]) => (
              <TableRow key={currency}>
                <TableCell>{currency}</TableCell>
                <TableCell align="right">{data.total.toFixed(2)}</TableCell>
                <TableCell align="right">{data.convertedTotal.toFixed(2)}</TableCell>
              </TableRow>
            ))}
            <TableRow sx={{ "& td": { fontWeight: "bold", bgcolor: "action.hover" } }}>
              <TableCell colSpan={2}>{t("total" as any)}</TableCell>
              <TableCell align="right">{costResult.total.toFixed(2)}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
        {Object.keys(costResult.breakdown).length === 0 && (
          <Box sx={{ py: 3, textAlign: "center" }}>
            <Typography variant="body2" color="text.secondary">
              {t("noCostsFound" as any) || "No costs found for this day."}
            </Typography>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t("close") || "Close"}</Button>
      </DialogActions>
    </Dialog>
  )
}
