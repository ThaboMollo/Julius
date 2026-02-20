import type { RecurringTemplate, CreateRecurringTemplate } from '../../domain/models'

export interface ITemplateRepo {
  getAll(): Promise<RecurringTemplate[]>
  getActive(): Promise<RecurringTemplate[]>
  getActiveBills(): Promise<RecurringTemplate[]>
  getByGroup(groupId: string): Promise<RecurringTemplate[]>
  getById(id: string): Promise<RecurringTemplate | undefined>
  create(template: CreateRecurringTemplate): Promise<RecurringTemplate>
  update(id: string, updates: Partial<RecurringTemplate>): Promise<void>
  delete(id: string): Promise<void>
}
