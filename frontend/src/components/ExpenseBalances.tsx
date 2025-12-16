import React, { useMemo } from "react"
import {
    Box,
    Typography,
    Avatar,
    List,
    ListItem,
    Divider
} from "@mui/material"
import type { TripMember, Expense } from "../types"
import { ArrowForward } from "@mui/icons-material"

interface ExpenseBalancesProps {
    members: TripMember[]
    expenses: Expense[]
    currency: string
}

interface Debt {
    fromMemberId: string
    toMemberId: string
    amount: number
}

export const ExpenseBalances: React.FC<ExpenseBalancesProps> = ({ members, expenses, currency }) => {

    // Calculate balances
    const debts = useMemo(() => {
        // 1. Calculate net balance for each member
        // Positive = Paid more than share (Owed money)
        // Negative = Paid less than share (Owes money)

        const balances: { [key: string]: number } = {}

        // Initialize
        members.forEach(m => balances[m.id] = 0)

        expenses.forEach(expense => {
            const amount = Number(expense.amount)
            const paidBy = expense.paidById

            if (paidBy) {
                balances[paidBy] = (balances[paidBy] || 0) + amount
            }

            // Subtract shares
            if (expense.splits && expense.splits.length > 0) {
                expense.splits.forEach(split => {
                    // Check if member exists in trip (might be deleted?)
                    if (balances[split.memberId] !== undefined) {
                        balances[split.memberId] -= Number(split.amount)
                    }
                })
            } else {
                // Legacy or simple expense (assume equal split among all current members?)
                // Or maybe assume paidBy paid for themselves? 
                // Better to assume equal split if no splits defined
                // BUT, our backend usually defines splits. 
                // If not splits, let's treat it as shared equally by all
                const share = amount / members.length
                members.forEach(m => {
                    balances[m.id] -= share
                })
            }
        })

        // 2. Simplify debts
        const owes: { id: string, amount: number }[] = []
        const owed: { id: string, amount: number }[] = []

        Object.entries(balances).forEach(([id, balance]) => {
            if (balance < -0.01) owes.push({ id, amount: -balance })
            else if (balance > 0.01) owed.push({ id, amount: balance })
        })

        owes.sort((a, b) => b.amount - a.amount)
        owed.sort((a, b) => b.amount - a.amount)

        const result: Debt[] = []

        let i = 0 // owes index
        let j = 0 // owed index

        while (i < owes.length && j < owed.length) {
            const debtor = owes[i]
            const creditor = owed[j]

            const amount = Math.min(debtor.amount, creditor.amount)

            if (amount > 0) {
                result.push({
                    fromMemberId: debtor.id,
                    toMemberId: creditor.id,
                    amount
                })
            }

            debtor.amount -= amount
            creditor.amount -= amount

            if (debtor.amount < 0.01) i++
            if (creditor.amount < 0.01) j++
        }

        return result
    }, [members, expenses])

    const getMember = (id: string) => members.find(m => m.id === id)

    if (debts.length === 0) {
        return (
            <Box textAlign="center" py={4}>
                <Typography color="text.secondary">No debts. Everyone is settled up!</Typography>
            </Box>
        )
    }

    return (
        <List>
            {debts.map((debt, index) => {
                const from = getMember(debt.fromMemberId)
                const to = getMember(debt.toMemberId)

                if (!from || !to) return null

                return (
                    <React.Fragment key={index}>
                        <ListItem>
                            <Box display="flex" alignItems="center" width="100%" gap={2}>
                                <Box display="flex" alignItems="center" gap={1} flex={1}>
                                    <Avatar sx={{ width: 32, height: 32, bgcolor: from.color, fontSize: '0.8rem' }}>
                                        {from.name.charAt(0)}
                                    </Avatar>
                                    <Typography variant="body2">{from.name}</Typography>
                                </Box>

                                <Box display="flex" flexDirection="column" alignItems="center">
                                    <Typography variant="caption" color="text.secondary">owes</Typography>
                                    <ArrowForward color="action" fontSize="small" />
                                    <Typography fontWeight="bold" color="error.main">
                                        {currency}{debt.amount.toFixed(2)}
                                    </Typography>
                                </Box>

                                <Box display="flex" alignItems="center" gap={1} flex={1} justifyContent="flex-end">
                                    <Typography variant="body2">{to.name}</Typography>
                                    <Avatar sx={{ width: 32, height: 32, bgcolor: to.color, fontSize: '0.8rem' }}>
                                        {to.name.charAt(0)}
                                    </Avatar>
                                </Box>
                            </Box>
                        </ListItem>
                        {index < debts.length - 1 && <Divider component="li" />}
                    </React.Fragment>
                )
            })}
        </List>
    )
}
