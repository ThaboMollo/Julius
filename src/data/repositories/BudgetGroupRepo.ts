import type { BudgetGroup, CreateBudgetGroup } from '../../domain/models'

export interface IBudgetGroupRepo {
  getAll(): Promise<BudgetGroup[]>
  getActive(): Promise<BudgetGroup[]>
  getById(id: string): Promise<BudgetGroup | undefined>
  create(group: CreateBudgetGroup): Promise<BudgetGroup>
  update(id: string, updates: Partial<BudgetGroup>): Promise<void>
  delete(id: string): Promise<void>
  hasReferences(id: string): Promise<boolean>
}
