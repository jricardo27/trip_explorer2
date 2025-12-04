interface ExpenseSplit {
  member_id: string
  amount?: number
  percentage?: number
}

interface Settlement {
  from: string
  to: string
  amount: number
}

/**
 * Calculate expense splits based on split type
 */
export function calculateSplits(
  totalAmount: number,
  splitType: "equal" | "percentage" | "custom",
  splits: ExpenseSplit[],
): ExpenseSplit[] {
  if (splitType === "equal") {
    const amountPerPerson = totalAmount / splits.length
    return splits.map((split) => ({
      ...split,
      amount: Number(amountPerPerson.toFixed(2)),
      percentage: Number((100 / splits.length).toFixed(2)),
    }))
  }

  if (splitType === "percentage") {
    const totalPercentage = splits.reduce((sum, s) => sum + (s.percentage || 0), 0)

    if (Math.abs(totalPercentage - 100) > 0.01) {
      throw new Error(`Percentages must sum to 100, got ${totalPercentage}`)
    }

    return splits.map((split) => ({
      ...split,
      amount: Number(((totalAmount * (split.percentage || 0)) / 100).toFixed(2)),
    }))
  }

  // Custom splits
  const totalSplit = splits.reduce((sum, s) => sum + (s.amount || 0), 0)

  if (Math.abs(totalSplit - totalAmount) > 0.01) {
    throw new Error(`Split amounts must sum to total amount (${totalAmount}), got ${totalSplit}`)
  }

  return splits.map((split) => ({
    ...split,
    percentage: Number((((split.amount || 0) / totalAmount) * 100).toFixed(2)),
  }))
}

/**
 * Calculate settlements to minimize number of transactions
 * Uses greedy algorithm to optimize payments
 */
export function calculateSettlements(balances: Array<{ id: string; name: string; balance: number }>): Settlement[] {
  const settlements: Settlement[] = []

  // Separate creditors (positive balance) and debtors (negative balance)
  const creditors = balances
    .filter((b) => b.balance > 0.01)
    .sort((a, b) => b.balance - a.balance)
    .map((b) => ({ ...b })) // Clone to avoid mutation

  const debtors = balances
    .filter((b) => b.balance < -0.01)
    .sort((a, b) => a.balance - b.balance)
    .map((b) => ({ ...b })) // Clone to avoid mutation

  let creditorIdx = 0
  let debtorIdx = 0

  while (creditorIdx < creditors.length && debtorIdx < debtors.length) {
    const creditor = creditors[creditorIdx]
    const debtor = debtors[debtorIdx]

    const amount = Math.min(creditor.balance, Math.abs(debtor.balance))

    if (amount > 0.01) {
      settlements.push({
        from: debtor.name,
        to: creditor.name,
        amount: Number(amount.toFixed(2)),
      })

      creditor.balance -= amount
      debtor.balance += amount
    }

    if (creditor.balance < 0.01) creditorIdx++
    if (Math.abs(debtor.balance) < 0.01) debtorIdx++
  }

  return settlements
}

/**
 * Calculate who owes whom based on expenses and splits
 */
export function calculateBalances(
  members: Array<{ id: string; name: string }>,
  expenses: Array<{
    paid_by: string
    amount: number
    splits: Array<{ member_id: string; amount: number }>
  }>,
): Array<{ id: string; name: string; paid: number; owed: number; balance: number }> {
  const balances = new Map<string, { paid: number; owed: number }>()

  // Initialize balances
  members.forEach((member) => {
    balances.set(member.id, { paid: 0, owed: 0 })
  })

  // Calculate paid and owed amounts
  expenses.forEach((expense) => {
    const payer = balances.get(expense.paid_by)
    if (payer) {
      payer.paid += expense.amount
    }

    expense.splits.forEach((split) => {
      const member = balances.get(split.member_id)
      if (member) {
        member.owed += split.amount
      }
    })
  })

  // Convert to array with balance
  return members.map((member) => {
    const balance = balances.get(member.id) || { paid: 0, owed: 0 }
    return {
      id: member.id,
      name: member.name,
      paid: Number(balance.paid.toFixed(2)),
      owed: Number(balance.owed.toFixed(2)),
      balance: Number((balance.paid - balance.owed).toFixed(2)),
    }
  })
}
