import type { BudgetMonth, CreateBudgetMonth } from '../../domain/models'

export interface IBudgetMonthRepo {
  getAll(): Promise<BudgetMonth[]>
  getByKey(monthKey: string): Promise<BudgetMonth | undefined>
  getById(id: string): Promise<BudgetMonth | undefined>
  getOrCreate(year: number, month: number): Promise<BudgetMonth>
  create(budgetMonth: CreateBudgetMonth): Promise<BudgetMonth>
  update(id: string, updates: Partial<BudgetMonth>): Promise<void>
  delete(id: string): Promise<void>
}
