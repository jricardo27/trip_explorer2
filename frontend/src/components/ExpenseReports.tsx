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

import type { Expense, TripMember } from "../types"

ChartJS.register(ArcElement, ChartTooltip, Legend, CategoryScale, LinearScale, BarElement, Title)

interface ExpenseReportsProps {
  expenses: Expense[]
  members: TripMember[]
  defaultCurrency: string
  exchangeRates?: Record<string, number>
}

export const ExpenseReports = ({ expenses, members, defaultCurrency, exchangeRates = {} }: ExpenseReportsProps) => {
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
