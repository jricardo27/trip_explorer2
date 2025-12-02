import WarningIcon from "@mui/icons-material/Warning"
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  LinearProgress,
  Chip,
  List,
  ListItem,
  ListItemText,
  Divider,
} from "@mui/material"
import axios from "axios"
import React, { useState, useEffect, useCallback } from "react"

import { Budget, Balance, Settlement } from "../../types/expenses"

interface BudgetOverviewProps {
  tripId: string
}

const BudgetOverview: React.FC<BudgetOverviewProps> = ({ tripId }) => {
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [balances, setBalances] = useState<Balance[]>([])
  const [settlements, setSettlements] = useState<Settlement[]>([])

  const fetchBudgetData = useCallback(async () => {
    try {
      const [budgetsRes, balancesRes, settlementsRes] = await Promise.all([
        axios.get(`/api/trips/${tripId}/budgets`),
        axios.get(`/api/trips/${tripId}/expenses/balances`),
        axios.get(`/api/trips/${tripId}/expenses/settlements`),
      ])
      setBudgets(budgetsRes.data)
      setBalances(balancesRes.data)
      setSettlements(settlementsRes.data)
    } catch (err) {
      console.error("Error fetching budget data:", err)
    }
  }, [tripId])

  useEffect(() => {
    fetchBudgetData()
  }, [fetchBudgetData])

  const getProgressColor = (spent: number, limit: number, threshold?: number) => {
    const percentage = (spent / limit) * 100
    if (threshold && percentage >= threshold) return "error"
    if (percentage >= 90) return "warning"
    return "primary"
  }

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Budget Overview
      </Typography>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        {budgets.map((budget) => {
          const percentage = (budget.spent_amount / budget.amount_limit) * 100
          const isOverBudget = budget.spent_amount > budget.amount_limit
          const isNearThreshold = budget.alert_threshold && percentage >= budget.alert_threshold

          return (
            <Grid item xs={12} sm={6} md={4} key={budget.id}>
              <Card variant="outlined">
                <CardContent>
                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
                    <Typography variant="subtitle2" sx={{ textTransform: "capitalize" }}>
                      {budget.category}
                    </Typography>
                    {(isOverBudget || isNearThreshold) && <WarningIcon color="warning" fontSize="small" />}
                  </Box>
                  <Typography variant="h6" color={isOverBudget ? "error" : "text.primary"}>
                    {budget.currency} {budget.spent_amount.toFixed(2)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    of {budget.currency} {budget.amount_limit.toFixed(2)}
                  </Typography>
                  <LinearProgress
                    variant="determinate"
                    value={Math.min(percentage, 100)}
                    color={getProgressColor(budget.spent_amount, budget.amount_limit, budget.alert_threshold)}
                    sx={{ mt: 1, height: 6, borderRadius: 3 }}
                  />
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: "block" }}>
                    {percentage.toFixed(0)}% used
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          )
        })}
      </Grid>

      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="subtitle1" gutterBottom>
                Member Balances
              </Typography>
              <List dense>
                {balances.map((balance, index) => (
                  <React.Fragment key={balance.member_id}>
                    <ListItem>
                      <ListItemText
                        primary={`Member ${balance.member_id.substring(0, 8)}...`}
                        secondary={
                          <Chip
                            label={`${balance.currency} ${balance.amount.toFixed(2)}`}
                            size="small"
                            color={balance.amount >= 0 ? "success" : "error"}
                            sx={{ mt: 0.5 }}
                          />
                        }
                      />
                    </ListItem>
                    {index < balances.length - 1 && <Divider />}
                  </React.Fragment>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="subtitle1" gutterBottom>
                Suggested Settlements
              </Typography>
              <List dense>
                {settlements.map((settlement, index) => (
                  <React.Fragment key={`${settlement.from_member_id}-${settlement.to_member_id}`}>
                    <ListItem>
                      <ListItemText
                        primary={
                          <Typography variant="body2">
                            {settlement.from_member_id.substring(0, 8)}... → {settlement.to_member_id.substring(0, 8)}
                            ...
                          </Typography>
                        }
                        secondary={
                          <Typography variant="body2" color="primary" fontWeight="bold">
                            {settlement.currency} {settlement.amount.toFixed(2)}
                          </Typography>
                        }
                      />
                    </ListItem>
                    {index < settlements.length - 1 && <Divider />}
                  </React.Fragment>
                ))}
                {settlements.length === 0 && (
                  <ListItem>
                    <ListItemText
                      primary={
                        <Typography variant="body2" color="text.secondary" fontStyle="italic">
                          All settled up!
                        </Typography>
                      }
                    />
                  </ListItem>
                )}
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  )
}

export default BudgetOverview
