import { Request, Response, NextFunction } from "express"
import { expenseService } from "../services/ExpenseService"
import { createExpenseSchema, updateExpenseSchema } from "../utils/validation"

export const getExpenses = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tripId } = req.params
    const expenses = await expenseService.getExpensesByTrip(tripId)
    res.json(expenses)
  } catch (error) {
    next(error)
  }
}

export const createExpense = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validatedData = createExpenseSchema.parse(req.body)
    const expense = await expenseService.createExpense(validatedData)
    res.status(201).json(expense)
  } catch (error) {
    next(error)
  }
}

export const updateExpense = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params
    const validatedData = updateExpenseSchema.parse(req.body)
    const expense = await expenseService.updateExpense(id, validatedData)
    res.json(expense)
  } catch (error) {
    next(error)
  }
}

export const deleteExpense = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params
    await expenseService.deleteExpense(id)
    res.status(204).send()
  } catch (error) {
    next(error)
  }
}
