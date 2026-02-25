import { db } from './db'
import type { ITemplateRepo } from '../repositories/TemplateRepo'
import type { RecurringTemplate, CreateRecurringTemplate } from '../../domain/models'
import { activeUserId, forActiveUser, stampNew, stampSoftDelete, stampUpdate } from './scoped'

function generateId(): string {
  return crypto.randomUUID()
}

export const templateRepo: ITemplateRepo = {
  async getAll(): Promise<RecurringTemplate[]> {
    return forActiveUser(await db.recurringTemplates.toArray())
  },

  async getActive(): Promise<RecurringTemplate[]> {
    return (await this.getAll()).filter((t) => t.isActive)
  },

  async getActiveBills(): Promise<RecurringTemplate[]> {
    return (await this.getActive()).filter((t) => t.isBill)
  },

  async getByGroup(groupId: string): Promise<RecurringTemplate[]> {
    return (await this.getAll()).filter((t) => t.groupId === groupId)
  },

  async getById(id: string): Promise<RecurringTemplate | undefined> {
    const row = await db.recurringTemplates.get(id)
    if (!row) return undefined
    return row.userId === activeUserId() && row.deletedAt === null ? row : undefined
  },

  async create(template: CreateRecurringTemplate): Promise<RecurringTemplate> {
    const newTemplate: RecurringTemplate = {
      ...stampNew(template),
      id: generateId(),
    }
    await db.recurringTemplates.add(newTemplate)
    return newTemplate
  },

  async update(id: string, updates: Partial<RecurringTemplate>): Promise<void> {
    await db.recurringTemplates.update(id, stampUpdate(updates))
  },

  async delete(id: string): Promise<void> {
    await db.recurringTemplates.update(id, stampSoftDelete())
  },
}
