import type { Transaction, CreateTransaction } from '../../domain/models'

export interface ITransactionRepo {
  getAll(): Promise<Transaction[]>
  getByMonth(budgetMonthId: string): Promise<Transaction[]>
  getIncomeByMonth(budgetMonthId: string): Promise<Transaction[]>
  getByCategory(categoryId: string): Promise<Transaction[]>
  getByCommitment(commitmentId: string): Promise<Transaction[]>
  getByItem(budgetItemId: string): Promise<Transaction[]>
  getRecurringCandidates(): Promise<Transaction[]>
  getByDateRange(startDate: Date, endDate: Date): Promise<Transaction[]>
  getById(id: string): Promise<Transaction | undefined>
  create(transaction: CreateTransaction): Promise<Transaction>
  update(id: string, updates: Partial<Transaction>): Promise<void>
  delete(id: string): Promise<void>
  deleteByMonth(budgetMonthId: string): Promise<void>
}
