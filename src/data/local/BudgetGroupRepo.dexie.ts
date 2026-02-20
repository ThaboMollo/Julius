import { db } from './db'
import type { IBudgetGroupRepo } from '../repositories/BudgetGroupRepo'
import type { BudgetGroup, CreateBudgetGroup } from '../../domain/models'

function generateId(): string {
  return crypto.randomUUID()
}

export const budgetGroupRepo: IBudgetGroupRepo = {
  async getAll(): Promise<BudgetGroup[]> {
    return db.budgetGroups.orderBy('sortOrder').toArray()
  },

  async getActive(): Promise<BudgetGroup[]> {
    return db.budgetGroups
      .where('isActive')
      .equals(1)
      .sortBy('sortOrder')
  },

  async getById(id: string): Promise<BudgetGroup | undefined> {
    return db.budgetGroups.get(id)
  },

  async create(group: CreateBudgetGroup): Promise<BudgetGroup> {
    const now = new Date()
    const newGroup: BudgetGroup = {
      ...group,
      id: generateId(),
      createdAt: now,
      updatedAt: now,
    }
    await db.budgetGroups.add(newGroup)
    return newGroup
  },

  async update(id: string, updates: Partial<BudgetGroup>): Promise<void> {
    await db.budgetGroups.update(id, {
      ...updates,
      updatedAt: new Date(),
    })
  },

  async delete(id: string): Promise<void> {
    await db.budgetGroups.delete(id)
  },

  async hasReferences(id: string): Promise<boolean> {
    const categoryCount = await db.categories.where('groupId').equals(id).count()
    const itemCount = await db.budgetItems.where('groupId').equals(id).count()
    const templateCount = await db.recurringTemplates.where('groupId').equals(id).count()
    return categoryCount > 0 || itemCount > 0 || templateCount > 0
  },
}
