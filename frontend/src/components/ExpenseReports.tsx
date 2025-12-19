import { Download as DownloadIcon, TableChart, BarChart } from "@mui/icons-material"
import {
  Box,
  Typography,
  Grid,
  Paper,
  Button,
  ButtonGroup,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
} from "@mui/material"
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip as ChartTooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
} from "chart.js"
import dayjs from "dayjs"
import { useMemo, useState } from "react"
import { Pie, Bar } from "react-chartjs-2"
import * as XLSX from "xlsx"

import type { Activity, Expense, TripMember } from "../types"

ChartJS.register(ArcElement, ChartTooltip, Legend, CategoryScale, LinearScale, BarElement, Title)

interface ExpenseReportsProps {
  expenses: Expense[]
  activities: Activity[]
  members: TripMember[]
  defaultCurrency: string
  exchangeRates?: Record<string, number>
}

export const ExpenseReports = ({
  expenses,
  activities,
  members,
  defaultCurrency,
  exchangeRates = {},
}: ExpenseReportsProps) => {
  // State
  const [viewMode, setViewMode] = useState<"charts" | "spreadsheet">("charts")

  // Spreadsheet Data (Calculated first to be reused for charts)
  const processedExpenses = useMemo(() => {
    return expenses.map((e) => {
      const rate = e.currency === defaultCurrency ? 1 : exchangeRates[e.currency] || 1
      const convertedAmount = Number(e.amount) * rate
      const payer = members.find((m) => m.id === e.paidById)?.name || "Unknown"

      return {
        ...e,
        convertedAmount,
        rateUsed: rate,
        payerName: payer,
      }
    })
  }, [expenses, defaultCurrency, exchangeRates, members])

  const categoryData = useMemo(() => {
    const totals: Record<string, number> = {}
    processedExpenses.forEach((e) => {
      totals[e.category] = (totals[e.category] || 0) + e.convertedAmount
    })

    return {
      labels: Object.keys(totals),
      datasets: [
        {
          label: `Expenses by Category (${defaultCurrency})`,
          data: Object.values(totals),
          backgroundColor: [
            "#FF6384",
            "#36A2EB",
            "#FFCE56",
            "#4BC0C0",
            "#9966FF",
            "#FF9F40",
            "#FFCD56",
            "#C9CBCF",
            "#36A2EB",
            "#FF6384",
          ],
          borderWidth: 1,
        },
      ],
    }
  }, [processedExpenses, defaultCurrency])

  const memberData = useMemo(() => {
    const totals: Record<string, number> = {}
    processedExpenses.forEach((e) => {
      totals[e.payerName] = (totals[e.payerName] || 0) + e.convertedAmount
    })

    return {
      labels: Object.keys(totals),
      datasets: [
        {
          label: `Amount Paid (${defaultCurrency})`,
          data: Object.values(totals),
          backgroundColor: "#36A2EB",
        },
      ],
    }
  }, [processedExpenses, defaultCurrency])

  const plannedVsSpentData = useMemo(() => {
    const categories = ["Accommodation", "Transport", "Attraction", "Food", "Other"]
    const planned: Record<string, number> = {}
    const spent: Record<string, number> = {}

    // Initialize
    categories.forEach((cat) => {
      planned[cat] = 0
      spent[cat] = 0
    })

    // Process Activities (Planned and potentially Spent)
    activities.forEach((a) => {
      const cat = a.activityType || "Other"
      const rate = a.currency === defaultCurrency ? 1 : exchangeRates[a.currency || ""] || 1

      const p = Number(a.estimatedCost || 0) * rate
      const s = Number(a.actualCost || 0) * rate

      const key = categories.includes(cat) ? cat : "Other"
      planned[key] += p
      spent[key] += s
    })

    // Process independent Expenses (Spent)
    processedExpenses.forEach((e) => {
      // Avoid double counting if expense is linked to activity (already handled in activities.actualCost?)
      // Actually, many users might use one OR the other.
      // If we have an activity.id on the expense, we should prioritize the expense as the 'actual' spent amount.
      if (!e.activityId) {
        const key = categories.includes(e.category) ? e.category : "Other"
        spent[key] += e.convertedAmount
      }
    })

    return {
      labels: categories,
      datasets: [
        {
          label: "Planned (Est.)",
          data: categories.map((c) => planned[c]),
          backgroundColor: "rgba(153, 102, 255, 0.5)",
        },
        {
          label: "Spent (Actual)",
          data: categories.map((c) => spent[c]),
          backgroundColor: "rgba(75, 192, 192, 0.5)",
        },
      ],
    }
  }, [activities, processedExpenses, defaultCurrency, exchangeRates])

  const handleExport = () => {
    const dataToExport = processedExpenses.map((e) => ({
      Date: dayjs(e.paymentDate || e.createdAt).format("YYYY-MM-DD"),
      Description: e.description,
      Category: e.category,
      Amount: e.amount,
      Currency: e.currency,
      [`Amount (${defaultCurrency})`]: e.convertedAmount.toFixed(2),
      Rate: e.rateUsed,
      PaidBy: e.payerName,
      Notes: e.notes || "",
    }))

    const ws = XLSX.utils.json_to_sheet(dataToExport)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Expenses")
    XLSX.writeFile(wb, `Trip_Expenses_${dayjs().format("YYYYMMDD")}.xlsx`)
  }

  return (
    <Box height="100%" overflow="auto" p={1}>
      <Box mb={3} display="flex" justifyContent="space-between" alignItems="center">
        <ButtonGroup variant="outlined" size="small">
          <Button
            startIcon={<BarChart />}
            variant={viewMode === "charts" ? "contained" : "outlined"}
            onClick={() => setViewMode("charts")}
          >
            Charts
          </Button>
          <Button
            startIcon={<TableChart />}
            variant={viewMode === "spreadsheet" ? "contained" : "outlined"}
            onClick={() => setViewMode("spreadsheet")}
          >
            Spreadsheet
          </Button>
        </ButtonGroup>

        <Box display="flex" gap={2}>
          {viewMode === "spreadsheet" && (
            <Button startIcon={<DownloadIcon />} onClick={handleExport} size="small" variant="outlined">
              Export Excel
            </Button>
          )}
        </Box>
      </Box>

      {viewMode === "charts" && (
        <>
          {processedExpenses.length === 0 ? (
            <Typography align="center" color="text.secondary" mt={4}>
              No expenses recorded yet.
            </Typography>
          ) : (
            <Grid container spacing={3}>
              {/* @ts-expect-error -- Grid types out of sync with MUI version */}
              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 2, height: 300, display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <Typography variant="h6" gutterBottom>
                    By Category ({defaultCurrency})
                  </Typography>
                  <Box flexGrow={1} width="100%" position="relative">
                    <Pie
                      data={categoryData}
                      options={{
                        maintainAspectRatio: false,
                        plugins: { legend: { position: "right" as const } },
                      }}
                    />
                  </Box>
                </Paper>
              </Grid>
              {/* @ts-expect-error -- Grid types out of sync with MUI version */}
              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 2, height: 300, display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <Typography variant="h6" gutterBottom>
                    By Member (Paid)
                  </Typography>
                  <Box flexGrow={1} width="100%" position="relative">
                    <Bar
                      data={memberData}
                      options={{
                        maintainAspectRatio: false,
                        scales: { y: { beginAtZero: true } },
                      }}
                    />
                  </Box>
                </Paper>
              </Grid>
              {/* @ts-expect-error -- Grid types out of sync with MUI version */}
              <Grid item xs={12}>
                <Paper sx={{ p: 2, display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <Typography variant="h6" gutterBottom>
                    Planned vs Spent ({defaultCurrency})
                  </Typography>
                  <Box sx={{ height: 350, width: "100%", position: "relative", mb: 4 }}>
                    <Bar
                      data={plannedVsSpentData}
                      options={{
                        maintainAspectRatio: false,
                        scales: { y: { beginAtZero: true } },
                      }}
                    />
                  </Box>

                  <TableContainer component={Paper} elevation={0} sx={{ border: "1px solid", borderColor: "divider" }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Category</TableCell>
                          <TableCell align="right">Planned</TableCell>
                          <TableCell align="right">Spent</TableCell>
                          <TableCell align="right">Difference</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {plannedVsSpentData.labels.map((cat, i) => {
                          const p = plannedVsSpentData.datasets[0].data[i] as number
                          const s = plannedVsSpentData.datasets[1].data[i] as number
                          const diff = p - s
                          return (
                            <TableRow key={cat.toString()}>
                              <TableCell>{cat.toString()}</TableCell>
                              <TableCell align="right">{p.toFixed(2)}</TableCell>
                              <TableCell align="right">{s.toFixed(2)}</TableCell>
                              <TableCell
                                align="right"
                                sx={{ color: diff < 0 ? "error.main" : "success.main", fontWeight: "bold" }}
                              >
                                {diff > 0 ? "+" : ""}
                                {diff.toFixed(2)}
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Paper>
              </Grid>
            </Grid>
          )}
        </>
      )}

      {viewMode === "spreadsheet" && (
        <TableContainer component={Paper}>
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow>
                <TableCell>Date</TableCell>
                <TableCell>Description</TableCell>
                <TableCell>Category</TableCell>
                <TableCell align="right">Amount</TableCell>
                <TableCell align="right">Conv. ({defaultCurrency})</TableCell>
                <TableCell>Paid By</TableCell>
                <TableCell>Notes</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {processedExpenses.map((e) => (
                <TableRow key={e.id}>
                  <TableCell>{dayjs(e.paymentDate || e.createdAt).format("MMM D")}</TableCell>
                  <TableCell>{e.description}</TableCell>
                  <TableCell>
                    <Chip label={e.category} size="small" />
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" component="span" color="text.secondary" sx={{ mr: 0.5 }}>
                      {e.currency}
                    </Typography>
                    {Number(e.amount).toFixed(2)}
                  </TableCell>
                  <TableCell align="right">{e.convertedAmount.toFixed(2)}</TableCell>
                  <TableCell>{e.payerName}</TableCell>
                  <TableCell sx={{ maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {e.notes}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  )
}
