import type { BudgetItem, CreateBudgetItem } from '../../domain/models'

export interface IBudgetItemRepo {
  getAll(): Promise<BudgetItem[]>
  getByMonth(budgetMonthId: string): Promise<BudgetItem[]>
  getByMonthAndGroup(budgetMonthId: string, groupId: string): Promise<BudgetItem[]>
  getByCategory(categoryId: string): Promise<BudgetItem[]>
  getBillsByMonth(budgetMonthId: string): Promise<BudgetItem[]>
  getById(id: string): Promise<BudgetItem | undefined>
  create(item: CreateBudgetItem): Promise<BudgetItem>
  createMany(items: CreateBudgetItem[]): Promise<BudgetItem[]>
  update(id: string, updates: Partial<BudgetItem>): Promise<void>
  delete(id: string): Promise<void>
  deleteByMonth(budgetMonthId: string): Promise<void>
}
