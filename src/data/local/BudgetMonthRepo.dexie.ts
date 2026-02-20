import { format } from 'date-fns'
import { db } from './db'
import type { IBudgetMonthRepo } from '../repositories/BudgetMonthRepo'
import type { BudgetMonth, CreateBudgetMonth } from '../../domain/models'

function generateId(): string {
  return crypto.randomUUID()
}

export const budgetMonthRepo: IBudgetMonthRepo = {
  async getAll(): Promise<BudgetMonth[]> {
    return db.budgetMonths.toArray()
  },

  async getByKey(monthKey: string): Promise<BudgetMonth | undefined> {
    return db.budgetMonths.where('monthKey').equals(monthKey).first()
  },

  async getById(id: string): Promise<BudgetMonth | undefined> {
    return db.budgetMonths.get(id)
  },

  async getOrCreate(year: number, month: number): Promise<BudgetMonth> {
    const monthKey = format(new Date(year, month - 1, 1), 'yyyy-MM')

    const existing = await this.getByKey(monthKey)
    if (existing) {
      return existing
    }

    const newMonth = await this.create({
      year,
      month,
      monthKey,
      expectedIncome: null,
    })

    return newMonth
  },

  async create(budgetMonth: CreateBudgetMonth): Promise<BudgetMonth> {
    const now = new Date()
    const newMonth: BudgetMonth = {
      ...budgetMonth,
      id: generateId(),
      createdAt: now,
      updatedAt: now,
    }
    await db.budgetMonths.add(newMonth)
    return newMonth
  },

  async update(id: string, updates: Partial<BudgetMonth>): Promise<void> {
    await db.budgetMonths.update(id, {
      ...updates,
      updatedAt: new Date(),
    })
  },

  async delete(id: string): Promise<void> {
    await db.budgetMonths.delete(id)
  },
}
