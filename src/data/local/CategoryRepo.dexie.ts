import { db } from './db'
import type { ICategoryRepo } from '../repositories/CategoryRepo'
import type { Category, CreateCategory } from '../../domain/models'
import { activeUserId, forActiveUser, stampNew, stampSoftDelete, stampUpdate } from './scoped'

function generateId(): string {
  return crypto.randomUUID()
}

function normalizeName(value: string): string {
  return value.trim().toLocaleLowerCase()
}

export const categoryRepo: ICategoryRepo = {
  async getAll(): Promise<Category[]> {
    return forActiveUser(await db.categories.toArray())
  },

  async getActive(): Promise<Category[]> {
    return (await this.getAll()).filter((c) => c.isActive)
  },

  async getByGroup(groupId: string): Promise<Category[]> {
    return (await this.getAll()).filter((c) => c.groupId === groupId)
  },

  async getById(id: string): Promise<Category | undefined> {
    const row = await db.categories.get(id)
    if (!row) return undefined
    return row.userId === activeUserId() && row.deletedAt === null ? row : undefined
  },

  async create(category: CreateCategory): Promise<Category> {
    const existing = (await this.getAll()).find(
      (entry) => entry.groupId === category.groupId && normalizeName(entry.name) === normalizeName(category.name),
    )
    if (existing) {
      throw new Error(`A category named "${category.name.trim()}" already exists in this group.`)
    }

    const newCategory: Category = {
      ...stampNew(category),
      id: generateId(),
    }
    await db.categories.add(newCategory)
    return newCategory
  },

  async update(id: string, updates: Partial<Category>): Promise<void> {
    if (updates.name || updates.groupId) {
      const current = await this.getById(id)
      if (!current) return
      const nextGroupId = updates.groupId ?? current.groupId
      const nextName = updates.name ?? current.name
      const existing = (await this.getAll()).find(
        (entry) =>
          entry.id !== id &&
          entry.groupId === nextGroupId &&
          normalizeName(entry.name) === normalizeName(nextName),
      )
      if (existing) {
        throw new Error(`A category named "${nextName.trim()}" already exists in this group.`)
      }
    }
    await db.categories.update(id, stampUpdate(updates))
  },

  async delete(id: string): Promise<void> {
    await db.categories.update(id, stampSoftDelete())
  },

  async hasReferences(id: string): Promise<boolean> {
    const userId = activeUserId()
    const itemCount = (await db.budgetItems.where('categoryId').equals(id).toArray()).filter(
      (x) => x.userId === userId && x.deletedAt === null,
    ).length
    const txCount = (await db.transactions.where('categoryId').equals(id).toArray()).filter(
      (x) => x.userId === userId && x.deletedAt === null,
    ).length
    const templateCount = (await db.recurringTemplates.where('categoryId').equals(id).toArray()).filter(
      (x) => x.userId === userId && x.deletedAt === null,
    ).length
    return itemCount > 0 || txCount > 0 || templateCount > 0
  },
}
