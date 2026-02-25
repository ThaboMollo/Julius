import { db } from './db'
import type { IBudgetItemRepo } from '../repositories/BudgetItemRepo'
import type { BudgetItem, CreateBudgetItem } from '../../domain/models'
import { activeUserId, forActiveUser, stampNew, stampSoftDelete, stampUpdate } from './scoped'

function generateId(): string {
  return crypto.randomUUID()
}

export const budgetItemRepo: IBudgetItemRepo = {
  async getAll(): Promise<BudgetItem[]> {
    return forActiveUser(await db.budgetItems.toArray())
  },

  async getByMonth(budgetMonthId: string): Promise<BudgetItem[]> {
    return (await this.getAll()).filter((item) => item.budgetMonthId === budgetMonthId)
  },

  async getByMonthAndGroup(budgetMonthId: string, groupId: string): Promise<BudgetItem[]> {
    return (await this.getAll()).filter((item) => item.budgetMonthId === budgetMonthId && item.groupId === groupId)
  },

  async getByCategory(categoryId: string): Promise<BudgetItem[]> {
    return (await this.getAll()).filter((item) => item.categoryId === categoryId)
  },

  async getBillsByMonth(budgetMonthId: string): Promise<BudgetItem[]> {
    return (await this.getByMonth(budgetMonthId)).filter((item) => item.isBill)
  },

  async getById(id: string): Promise<BudgetItem | undefined> {
    const row = await db.budgetItems.get(id)
    if (!row) return undefined
    return row.userId === activeUserId() && row.deletedAt === null ? row : undefined
  },

  async create(item: CreateBudgetItem): Promise<BudgetItem> {
    const newItem: BudgetItem = {
      ...stampNew(item),
      id: generateId(),
    }
    await db.budgetItems.add(newItem)
    return newItem
  },

  async createMany(items: CreateBudgetItem[]): Promise<BudgetItem[]> {
    const newItems: BudgetItem[] = items.map((item) => ({
      ...stampNew(item),
      id: generateId(),
    }))
    await db.budgetItems.bulkAdd(newItems)
    return newItems
  },

  async update(id: string, updates: Partial<BudgetItem>): Promise<void> {
    await db.budgetItems.update(id, stampUpdate(updates))
  },

  async delete(id: string): Promise<void> {
    await db.budgetItems.update(id, stampSoftDelete())
  },

  async deleteByMonth(budgetMonthId: string): Promise<void> {
    const matches = await db.budgetItems.where('budgetMonthId').equals(budgetMonthId).toArray()
    const userId = activeUserId()
    await Promise.all(
      matches
        .filter((item) => item.userId === userId && item.deletedAt === null)
        .map((item) => db.budgetItems.update(item.id, stampSoftDelete())),
    )
  },
}
