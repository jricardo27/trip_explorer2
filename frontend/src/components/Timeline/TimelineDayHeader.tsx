import { Edit, CompareArrows } from "@mui/icons-material"
import { Box, Paper, Typography, FormControl, Select, MenuItem, IconButton, Tooltip } from "@mui/material"
import dayjs from "dayjs"

import { useLanguageStore } from "../../stores/languageStore"
import type { TripDay } from "../../types"

interface TimelineDayHeaderProps {
  day: TripDay
  onScenarioChange?: (dayId: string, scenarioId: string | null) => void
  onOpenCreateScenario: (dayId: string) => void
  onOpenRenameScenario: (dayId: string, scenarioId: string, currentName: string) => void
  totalCost: number
  dayHeaderHeight: number
  isComparisonMode: boolean
  onToggleComparison: (dayId: string) => void
}

export const TimelineDayHeader = ({
  day,
  onScenarioChange,
  onOpenCreateScenario,
  onOpenRenameScenario,
  totalCost,
  dayHeaderHeight,
  isComparisonMode,
  onToggleComparison,
}: TimelineDayHeaderProps) => {
  const { t } = useLanguageStore()

  const selectedScenario = day.scenarios?.find((s) => s.isSelected)

  return (
    <Paper
      data-header-id={`header-${day.id}`}
      elevation={selectedScenario ? 2 : 1}
      sx={{
        p: 1.5,
        position: "sticky",
        top: 0,
        zIndex: 10,
        bgcolor: "background.paper",
        borderBottom: "2px solid",
        borderBottomColor: selectedScenario ? "primary.main" : "#e0e0e0",
        display: "flex",
        flexDirection: "column",
        gap: 1,
        minHeight: dayHeaderHeight,
      }}
    >
      {/* Day Name & Date */}
      <Box sx={{ textAlign: "center" }}>
        <Typography variant="subtitle1" fontWeight="bold">
          {day.name || `Day ${(day.dayIndex ?? 0) + 1}`}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {dayjs(day.date).format("MMM D, YYYY")}
        </Typography>
      </Box>

      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
        <Tooltip title={t("compareScenarios") || "Compare Scenarios"}>
          <IconButton
            size="small"
            onClick={() => onToggleComparison(day.id)}
            color={isComparisonMode ? "primary" : "default"}
            disabled={!day.scenarios || day.scenarios.length === 0}
          >
            <CompareArrows />
          </IconButton>
        </Tooltip>

        <FormControl variant="standard" size="small" sx={{ minWidth: 120, flexGrow: 1 }}>
          <Select
            value={selectedScenario?.id || "main"}
            displayEmpty
            onChange={(e) => {
              const val = e.target.value
              if (val === "create_new") {
                onOpenCreateScenario(day.id)
              } else {
                onScenarioChange?.(day.id, val === "main" ? null : val)
              }
            }}
            inputProps={{ "aria-label": "Scenario" }}
            sx={{
              "& .MuiSelect-select": { py: 0, fontSize: "0.875rem", fontWeight: "bold" },
            }}
          >
            <MenuItem value="main">{t("mainPlan") || "Main Plan"}</MenuItem>
            {day.scenarios?.map((scenario) => (
              <MenuItem key={scenario.id} value={scenario.id}>
                {scenario.name}
              </MenuItem>
            ))}
            <MenuItem value="create_new" sx={{ fontStyle: "italic", borderTop: "1px solid #eee" }}>
              + {t("createAlternative") || "Create Alternative"}
            </MenuItem>
          </Select>
        </FormControl>

        {/* Rename Button for active custom scenario */}
        {selectedScenario && (
          <IconButton
            size="small"
            onClick={() => {
              onOpenRenameScenario(day.id, selectedScenario.id, selectedScenario.name)
            }}
            sx={{ opacity: 0.6, "&:hover": { opacity: 1 }, p: 0.5 }}
          >
            <Edit fontSize="inherit" sx={{ fontSize: "0.875rem" }} />
          </IconButton>
        )}
      </Box>

      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <Typography variant="caption" color="text.secondary">
          {dayjs(day.date).format("MMM D")}
        </Typography>
        {/* Cost Display */}
        <Typography variant="caption" sx={{ color: "success.main", fontWeight: "bold", fontSize: "0.7rem" }}>
          {new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(totalCost)}
        </Typography>
      </Box>
    </Paper>
  )
}
