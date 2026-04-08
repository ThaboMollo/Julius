import { db } from './db'
import type { IBudgetGroupRepo } from '../repositories/BudgetGroupRepo'
import type { BudgetGroup, CreateBudgetGroup } from '../../domain/models'
import { activeUserId, forActiveUser, stampNew, stampSoftDelete, stampUpdate } from './scoped'

function generateId(): string {
  return crypto.randomUUID()
}

function normalizeName(value: string): string {
  return value.trim().toLocaleLowerCase()
}

export const budgetGroupRepo: IBudgetGroupRepo = {
  async getAll(): Promise<BudgetGroup[]> {
    return forActiveUser(await db.budgetGroups.orderBy('sortOrder').toArray())
  },

  async getActive(): Promise<BudgetGroup[]> {
    return (await this.getAll()).filter((g) => g.isActive)
  },

  async getById(id: string): Promise<BudgetGroup | undefined> {
    const row = await db.budgetGroups.get(id)
    if (!row) return undefined
    return row.userId === activeUserId() && row.deletedAt === null ? row : undefined
  },

  async create(group: CreateBudgetGroup): Promise<BudgetGroup> {
    const existing = (await this.getAll()).find((entry) => normalizeName(entry.name) === normalizeName(group.name))
    if (existing) {
      throw new Error(`A budget group named "${group.name.trim()}" already exists.`)
    }

    const newGroup: BudgetGroup = {
      ...stampNew(group),
      id: generateId(),
    }
    await db.budgetGroups.add(newGroup)
    return newGroup
  },

  async update(id: string, updates: Partial<BudgetGroup>): Promise<void> {
    if (updates.name) {
      const existing = (await this.getAll()).find(
        (entry) => entry.id !== id && normalizeName(entry.name) === normalizeName(updates.name ?? ''),
      )
      if (existing) {
        throw new Error(`A budget group named "${updates.name.trim()}" already exists.`)
      }
    }
    await db.budgetGroups.update(id, stampUpdate(updates))
  },

  async delete(id: string): Promise<void> {
    await db.budgetGroups.update(id, stampSoftDelete())
  },

  async hasReferences(id: string): Promise<boolean> {
    const userId = activeUserId()
    const categories = await db.categories.where('groupId').equals(id).toArray()
    const items = await db.budgetItems.where('groupId').equals(id).toArray()
    const templates = await db.recurringTemplates.where('groupId').equals(id).toArray()

    const categoryCount = categories.filter((x) => x.userId === userId && x.deletedAt === null).length
    const itemCount = items.filter((x) => x.userId === userId && x.deletedAt === null).length
    const templateCount = templates.filter((x) => x.userId === userId && x.deletedAt === null).length

    return categoryCount > 0 || itemCount > 0 || templateCount > 0
  },
}
