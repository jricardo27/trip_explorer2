export interface Expense {
  id: string
  trip_id: string
  description: string
  amount: number
  currency: string
  paid_by_id: string
  category: string
  date: string
  notes?: string
  splits: ExpenseSplit[]
  created_at?: string
}

export interface ExpenseSplit {
  member_id: string
  amount: number
  percentage?: number
  type: "equal" | "percentage" | "exact" | "share"
}

export interface CreateExpenseRequest {
  trip_id: string
  description: string
  amount: number
  currency: string
  paid_by_id: string
  category: string
  date: string
  notes?: string
  split_type: "equal" | "percentage" | "exact" | "share"
  splits: { member_id: string; value: number }[]
}

export interface Settlement {
  from_member_id: string
  to_member_id: string
  amount: number
  currency: string
}

export interface Balance {
  member_id: string
  amount: number
  currency: string
}

export interface Budget {
  id: string
  trip_id: string
  category: string
  amount_limit: number
  currency: string
  spent_amount: number
  alert_threshold?: number
}
