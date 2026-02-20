import { db } from './db'
import type { IBillTickRepo } from '../repositories/BillTickRepo'
import type { BillTick, CreateBillTick } from '../../domain/models'

function generateId(): string {
  return crypto.randomUUID()
}

export const billTickRepo: IBillTickRepo = {
  async getByMonth(budgetMonthId: string): Promise<BillTick[]> {
    return db.billTicks.where('budgetMonthId').equals(budgetMonthId).toArray()
  },

  async getByMonthAndItem(
    budgetMonthId: string,
    budgetItemId: string
  ): Promise<BillTick | undefined> {
    return db.billTicks
      .where('[budgetMonthId+budgetItemId]')
      .equals([budgetMonthId, budgetItemId])
      .first()
  },

  async getById(id: string): Promise<BillTick | undefined> {
    return db.billTicks.get(id)
  },

  async create(billTick: CreateBillTick): Promise<BillTick> {
    const now = new Date()
    const newBillTick: BillTick = {
      ...billTick,
      id: generateId(),
      createdAt: now,
      updatedAt: now,
    }
    await db.billTicks.add(newBillTick)
    return newBillTick
  },

  async update(id: string, updates: Partial<BillTick>): Promise<void> {
    await db.billTicks.update(id, {
      ...updates,
      updatedAt: new Date(),
    })
  },

  async togglePaid(budgetMonthId: string, budgetItemId: string): Promise<BillTick> {
    const existing = await this.getByMonthAndItem(budgetMonthId, budgetItemId)

    if (existing) {
      const newIsPaid = !existing.isPaid
      await this.update(existing.id, {
        isPaid: newIsPaid,
        paidAt: newIsPaid ? new Date() : null,
      })
      return {
        ...existing,
        isPaid: newIsPaid,
        paidAt: newIsPaid ? new Date() : null,
      }
    }

    // Create a new tick marked as paid
    return this.create({
      budgetMonthId,
      budgetItemId,
      isPaid: true,
      paidAt: new Date(),
    })
  },

  async delete(id: string): Promise<void> {
    await db.billTicks.delete(id)
  },

  async deleteByMonth(budgetMonthId: string): Promise<void> {
    await db.billTicks.where('budgetMonthId').equals(budgetMonthId).delete()
  },
}
