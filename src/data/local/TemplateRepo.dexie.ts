import { db } from './db'
import type { ITemplateRepo } from '../repositories/TemplateRepo'
import type { RecurringTemplate, CreateRecurringTemplate } from '../../domain/models'

function generateId(): string {
  return crypto.randomUUID()
}

export const templateRepo: ITemplateRepo = {
  async getAll(): Promise<RecurringTemplate[]> {
    return db.recurringTemplates.toArray()
  },

  async getActive(): Promise<RecurringTemplate[]> {
    const all = await db.recurringTemplates.toArray()
    return all.filter((t) => t.isActive)
  },

  async getActiveBills(): Promise<RecurringTemplate[]> {
    const active = await this.getActive()
    return active.filter((t) => t.isBill)
  },

  async getByGroup(groupId: string): Promise<RecurringTemplate[]> {
    return db.recurringTemplates.where('groupId').equals(groupId).toArray()
  },

  async getById(id: string): Promise<RecurringTemplate | undefined> {
    return db.recurringTemplates.get(id)
  },

  async create(template: CreateRecurringTemplate): Promise<RecurringTemplate> {
    const now = new Date()
    const newTemplate: RecurringTemplate = {
      ...template,
      id: generateId(),
      createdAt: now,
      updatedAt: now,
    }
    await db.recurringTemplates.add(newTemplate)
    return newTemplate
  },

  async update(id: string, updates: Partial<RecurringTemplate>): Promise<void> {
    await db.recurringTemplates.update(id, {
      ...updates,
      updatedAt: new Date(),
    })
  },

  async delete(id: string): Promise<void> {
    await db.recurringTemplates.delete(id)
  },
}
