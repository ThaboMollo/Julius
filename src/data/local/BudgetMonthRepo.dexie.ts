import { format } from 'date-fns'
import { db } from './db'
import type { IBudgetMonthRepo } from '../repositories/BudgetMonthRepo'
import type { BudgetMonth, CreateBudgetMonth } from '../../domain/models'
import { activeUserId, forActiveUser, stampNew, stampSoftDelete, stampUpdate } from './scoped'

function generateId(): string {
  return crypto.randomUUID()
}

export const budgetMonthRepo: IBudgetMonthRepo = {
  async getAll(): Promise<BudgetMonth[]> {
    return forActiveUser(await db.budgetMonths.toArray())
  },

  async getByKey(monthKey: string): Promise<BudgetMonth | undefined> {
    return (await this.getAll()).find((m) => m.monthKey === monthKey)
  },

  async getById(id: string): Promise<BudgetMonth | undefined> {
    const row = await db.budgetMonths.get(id)
    if (!row) return undefined
    return row.userId === activeUserId() && row.deletedAt === null ? row : undefined
  },

  async getOrCreate(year: number, month: number): Promise<BudgetMonth> {
    const monthKey = format(new Date(year, month - 1, 1), 'yyyy-MM')

    const existing = await this.getByKey(monthKey)
    if (existing) {
      return existing
    }

    return this.create({
      year,
      month,
      monthKey,
      expectedIncome: null,
    })
  },

  async create(budgetMonth: CreateBudgetMonth): Promise<BudgetMonth> {
    const newMonth: BudgetMonth = {
      ...stampNew(budgetMonth),
      id: generateId(),
    }
    await db.budgetMonths.add(newMonth)
    return newMonth
  },

  async update(id: string, updates: Partial<BudgetMonth>): Promise<void> {
    await db.budgetMonths.update(id, stampUpdate(updates))
  },

  async delete(id: string): Promise<void> {
    await db.budgetMonths.update(id, stampSoftDelete())
  },
}
