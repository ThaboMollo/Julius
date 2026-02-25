import { db } from './db'
import type { IBillTickRepo } from '../repositories/BillTickRepo'
import type { BillTick, CreateBillTick } from '../../domain/models'
import { activeUserId, forActiveUser, stampNew, stampSoftDelete, stampUpdate } from './scoped'

function generateId(): string {
  return crypto.randomUUID()
}

export const billTickRepo: IBillTickRepo = {
  async getByMonth(budgetMonthId: string): Promise<BillTick[]> {
    return (await forActiveUser(await db.billTicks.where('budgetMonthId').equals(budgetMonthId).toArray()))
  },

  async getByMonthAndItem(
    budgetMonthId: string,
    budgetItemId: string,
  ): Promise<BillTick | undefined> {
    const userId = activeUserId()
    const found = await db.billTicks
      .where('[userId+budgetMonthId+budgetItemId]')
      .equals([userId, budgetMonthId, budgetItemId])
      .toArray()
    return found.find((row) => row.deletedAt === null)
  },

  async getById(id: string): Promise<BillTick | undefined> {
    const row = await db.billTicks.get(id)
    if (!row) return undefined
    return row.userId === activeUserId() && row.deletedAt === null ? row : undefined
  },

  async create(billTick: CreateBillTick): Promise<BillTick> {
    const newBillTick: BillTick = {
      ...stampNew(billTick),
      id: generateId(),
    }
    await db.billTicks.add(newBillTick)
    return newBillTick
  },

  async update(id: string, updates: Partial<BillTick>): Promise<void> {
    await db.billTicks.update(id, stampUpdate(updates))
  },

  async togglePaid(budgetMonthId: string, budgetItemId: string): Promise<BillTick> {
    const existing = await this.getByMonthAndItem(budgetMonthId, budgetItemId)

    if (existing) {
      const newIsPaid = !existing.isPaid
      const paidAt = newIsPaid ? new Date() : null
      await this.update(existing.id, {
        isPaid: newIsPaid,
        paidAt,
      })
      return {
        ...existing,
        isPaid: newIsPaid,
        paidAt,
      }
    }

    return this.create({
      budgetMonthId,
      budgetItemId,
      isPaid: true,
      paidAt: new Date(),
    })
  },

  async delete(id: string): Promise<void> {
    await db.billTicks.update(id, stampSoftDelete())
  },

  async deleteByMonth(budgetMonthId: string): Promise<void> {
    const matches = await this.getByMonth(budgetMonthId)
    await Promise.all(matches.map((row) => db.billTicks.update(row.id, stampSoftDelete())))
  },
}
