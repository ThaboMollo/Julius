import { db } from './db'
import type { ITransactionRepo } from '../repositories/TransactionRepo'
import type { Transaction, CreateTransaction } from '../../domain/models'
import { activeUserId, forActiveUser, stampNew, stampSoftDelete, stampUpdate } from './scoped'

function generateId(): string {
  return crypto.randomUUID()
}

export const transactionRepo: ITransactionRepo = {
  async getAll(): Promise<Transaction[]> {
    return forActiveUser(await db.transactions.toArray())
  },

  async getByMonth(budgetMonthId: string): Promise<Transaction[]> {
    return (await this.getAll()).filter((tx) => tx.budgetMonthId === budgetMonthId)
  },

  async getIncomeByMonth(budgetMonthId: string): Promise<Transaction[]> {
    return (await this.getByMonth(budgetMonthId)).filter((tx) => tx.kind === 'income')
  },

  async getByCategory(categoryId: string): Promise<Transaction[]> {
    return (await this.getAll()).filter((tx) => tx.categoryId === categoryId)
  },

  async getByCommitment(commitmentId: string): Promise<Transaction[]> {
    return (await this.getAll()).filter((tx) => tx.commitmentId === commitmentId)
  },

  async getByItem(budgetItemId: string): Promise<Transaction[]> {
    return (await this.getAll()).filter((tx) => tx.budgetItemId === budgetItemId)
  },

  async getRecurringCandidates(): Promise<Transaction[]> {
    return (await this.getAll()).filter((tx) => tx.kind === 'expense' && tx.amount > 0)
  },

  async getByDateRange(startDate: Date, endDate: Date): Promise<Transaction[]> {
    const start = startDate.getTime()
    const end = endDate.getTime()
    return (await this.getAll()).filter((tx) => {
      const time = new Date(tx.date).getTime()
      return time >= start && time <= end
    })
  },

  async getById(id: string): Promise<Transaction | undefined> {
    const row = await db.transactions.get(id)
    if (!row) return undefined
    return row.userId === activeUserId() && row.deletedAt === null ? row : undefined
  },

  async create(transaction: CreateTransaction): Promise<Transaction> {
    const newTransaction: Transaction = {
      ...stampNew(transaction),
      id: generateId(),
      commitmentId: transaction.commitmentId ?? null,
      kind: transaction.kind ?? 'expense',
      source: transaction.source ?? 'manual',
      merchant: transaction.merchant?.trim() ?? '',
    }
    await db.transactions.add(newTransaction)
    return newTransaction
  },

  async update(id: string, updates: Partial<Transaction>): Promise<void> {
    await db.transactions.update(id, stampUpdate(updates))
  },

  async delete(id: string): Promise<void> {
    await db.transactions.update(id, stampSoftDelete())
  },

  async deleteByMonth(budgetMonthId: string): Promise<void> {
    const matches = await db.transactions.where('budgetMonthId').equals(budgetMonthId).toArray()
    const userId = activeUserId()
    await Promise.all(
      matches
        .filter((tx) => tx.userId === userId && tx.deletedAt === null)
        .map((tx) => db.transactions.update(tx.id, stampSoftDelete())),
    )
  },
}
