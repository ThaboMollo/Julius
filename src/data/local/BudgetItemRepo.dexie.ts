import { db } from './db'
import type { IBudgetItemRepo } from '../repositories/BudgetItemRepo'
import type { BudgetItem, CreateBudgetItem } from '../../domain/models'

function generateId(): string {
  return crypto.randomUUID()
}

export const budgetItemRepo: IBudgetItemRepo = {
  async getAll(): Promise<BudgetItem[]> {
    return db.budgetItems.toArray()
  },

  async getByMonth(budgetMonthId: string): Promise<BudgetItem[]> {
    return db.budgetItems.where('budgetMonthId').equals(budgetMonthId).toArray()
  },

  async getByMonthAndGroup(budgetMonthId: string, groupId: string): Promise<BudgetItem[]> {
    return db.budgetItems
      .where('[budgetMonthId+groupId]')
      .equals([budgetMonthId, groupId])
      .toArray()
  },

  async getByCategory(categoryId: string): Promise<BudgetItem[]> {
    return db.budgetItems.where('categoryId').equals(categoryId).toArray()
  },

  async getBillsByMonth(budgetMonthId: string): Promise<BudgetItem[]> {
    const items = await db.budgetItems
      .where('budgetMonthId')
      .equals(budgetMonthId)
      .toArray()
    return items.filter((item) => item.isBill)
  },

  async getById(id: string): Promise<BudgetItem | undefined> {
    return db.budgetItems.get(id)
  },

  async create(item: CreateBudgetItem): Promise<BudgetItem> {
    const now = new Date()
    const newItem: BudgetItem = {
      ...item,
      id: generateId(),
      createdAt: now,
      updatedAt: now,
    }
    await db.budgetItems.add(newItem)
    return newItem
  },

  async createMany(items: CreateBudgetItem[]): Promise<BudgetItem[]> {
    const now = new Date()
    const newItems: BudgetItem[] = items.map((item) => ({
      ...item,
      id: generateId(),
      createdAt: now,
      updatedAt: now,
    }))
    await db.budgetItems.bulkAdd(newItems)
    return newItems
  },

  async update(id: string, updates: Partial<BudgetItem>): Promise<void> {
    await db.budgetItems.update(id, {
      ...updates,
      updatedAt: new Date(),
    })
  },

  async delete(id: string): Promise<void> {
    await db.budgetItems.delete(id)
  },

  async deleteByMonth(budgetMonthId: string): Promise<void> {
    await db.budgetItems.where('budgetMonthId').equals(budgetMonthId).delete()
  },
}
