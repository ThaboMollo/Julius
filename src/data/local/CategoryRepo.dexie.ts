import { db } from './db'
import type { ICategoryRepo } from '../repositories/CategoryRepo'
import type { Category, CreateCategory } from '../../domain/models'

function generateId(): string {
  return crypto.randomUUID()
}

export const categoryRepo: ICategoryRepo = {
  async getAll(): Promise<Category[]> {
    return db.categories.toArray()
  },

  async getActive(): Promise<Category[]> {
    const all = await db.categories.toArray()
    return all.filter((c) => c.isActive)
  },

  async getByGroup(groupId: string): Promise<Category[]> {
    return db.categories.where('groupId').equals(groupId).toArray()
  },

  async getById(id: string): Promise<Category | undefined> {
    return db.categories.get(id)
  },

  async create(category: CreateCategory): Promise<Category> {
    const now = new Date()
    const newCategory: Category = {
      ...category,
      id: generateId(),
      createdAt: now,
      updatedAt: now,
    }
    await db.categories.add(newCategory)
    return newCategory
  },

  async update(id: string, updates: Partial<Category>): Promise<void> {
    await db.categories.update(id, {
      ...updates,
      updatedAt: new Date(),
    })
  },

  async delete(id: string): Promise<void> {
    await db.categories.delete(id)
  },

  async hasReferences(id: string): Promise<boolean> {
    const itemCount = await db.budgetItems.where('categoryId').equals(id).count()
    const txCount = await db.transactions.where('categoryId').equals(id).count()
    const templateCount = await db.recurringTemplates.where('categoryId').equals(id).count()
    return itemCount > 0 || txCount > 0 || templateCount > 0
  },
}
