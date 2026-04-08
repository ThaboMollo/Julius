import { db } from './db'
import type { ITemplateRepo } from '../repositories/TemplateRepo'
import type {
  RecurringTemplate,
  CreateRecurringTemplate,
  RecurringTemplateTargetKind,
} from '../../domain/models'
import { activeUserId, forActiveUser, stampNew, stampSoftDelete, stampUpdate } from './scoped'

function generateId(): string {
  return crypto.randomUUID()
}

function normalizeName(value: string): string {
  return value.trim().toLocaleLowerCase()
}

function resolveTargetKind(template: Pick<CreateRecurringTemplate, 'targetKind' | 'isBill'>): RecurringTemplateTargetKind {
  return template.targetKind ?? (template.isBill ? 'commitment' : 'budget_item')
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
    const targetKind = resolveTargetKind(template)
    const existing = (await this.getAll()).find(
      (entry) =>
        entry.groupId === template.groupId &&
        entry.categoryId === template.categoryId &&
        normalizeName(entry.name) === normalizeName(template.name) &&
        (entry.targetKind ?? (entry.isBill ? 'commitment' : 'budget_item')) === targetKind,
    )
    if (existing) {
      throw new Error(`A recurring template named "${template.name.trim()}" already exists for this category.`)
    }

    const newTemplate: RecurringTemplate = {
      ...stampNew(template),
      id: generateId(),
      targetKind,
    }
    await db.recurringTemplates.add(newTemplate)
    return newTemplate
  },

  async update(id: string, updates: Partial<RecurringTemplate>): Promise<void> {
    if (updates.name || updates.groupId || updates.categoryId || updates.targetKind || typeof updates.isBill === 'boolean') {
      const current = await this.getById(id)
      if (!current) return
      const next = {
        ...current,
        ...updates,
      }
      const nextTargetKind = next.targetKind ?? (next.isBill ? 'commitment' : 'budget_item')
      const existing = (await this.getAll()).find(
        (entry) =>
          entry.id !== id &&
          entry.groupId === next.groupId &&
          entry.categoryId === next.categoryId &&
          normalizeName(entry.name) === normalizeName(next.name) &&
          (entry.targetKind ?? (entry.isBill ? 'commitment' : 'budget_item')) === nextTargetKind,
      )
      if (existing) {
        throw new Error(`A recurring template named "${next.name.trim()}" already exists for this category.`)
      }
    }
    await db.recurringTemplates.update(id, stampUpdate(updates))
  },

  async delete(id: string): Promise<void> {
    await db.recurringTemplates.update(id, stampSoftDelete())
  },
}
