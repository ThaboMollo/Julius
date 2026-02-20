import { db } from './db'
import type { ITransactionRepo } from '../repositories/TransactionRepo'
import type { Transaction, CreateTransaction } from '../../domain/models'

function generateId(): string {
  return crypto.randomUUID()
}

export const transactionRepo: ITransactionRepo = {
  async getAll(): Promise<Transaction[]> {
    return db.transactions.toArray()
  },

  async getByMonth(budgetMonthId: string): Promise<Transaction[]> {
    return db.transactions
      .where('budgetMonthId')
      .equals(budgetMonthId)
      .toArray()
  },

  async getByCategory(categoryId: string): Promise<Transaction[]> {
    return db.transactions.where('categoryId').equals(categoryId).toArray()
  },

  async getByItem(budgetItemId: string): Promise<Transaction[]> {
    return db.transactions.where('budgetItemId').equals(budgetItemId).toArray()
  },

  async getByDateRange(startDate: Date, endDate: Date): Promise<Transaction[]> {
    return db.transactions
      .where('date')
      .between(startDate, endDate, true, true)
      .toArray()
  },

  async getById(id: string): Promise<Transaction | undefined> {
    return db.transactions.get(id)
  },

  async create(transaction: CreateTransaction): Promise<Transaction> {
    const now = new Date()
    const newTransaction: Transaction = {
      ...transaction,
      id: generateId(),
      createdAt: now,
      updatedAt: now,
    }
    await db.transactions.add(newTransaction)
    return newTransaction
  },

  async update(id: string, updates: Partial<Transaction>): Promise<void> {
    await db.transactions.update(id, {
      ...updates,
      updatedAt: new Date(),
    })
  },

  async delete(id: string): Promise<void> {
    await db.transactions.delete(id)
  },

  async deleteByMonth(budgetMonthId: string): Promise<void> {
    await db.transactions.where('budgetMonthId').equals(budgetMonthId).delete()
  },
}
