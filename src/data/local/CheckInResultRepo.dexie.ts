import { db } from './db'
import type { CheckInResult, CreateCheckInResult } from '../../domain/models'
import { activeUserId, forActiveUser, stampNew, stampSoftDelete, stampUpdate } from './scoped'

function generateId(): string {
  return crypto.randomUUID()
}

export const checkInResultRepo = {
  async getAll(): Promise<CheckInResult[]> {
    return forActiveUser(await db.checkInResults.toArray())
  },

  async getById(id: string): Promise<CheckInResult | undefined> {
    const row = await db.checkInResults.get(id)
    if (!row) return undefined
    return row.userId === activeUserId() && row.deletedAt === null ? row : undefined
  },

  async getByMonthKey(monthKey: string): Promise<CheckInResult | undefined> {
    const userId = activeUserId()
    const rows = await db.checkInResults
      .where('[userId+monthKey]')
      .equals([userId, monthKey])
      .toArray()
    return rows.find((r) => r.deletedAt === null)
  },

  async create(data: CreateCheckInResult): Promise<CheckInResult> {
    const result: CheckInResult = {
      ...stampNew(data),
      id: generateId(),
    }
    await db.checkInResults.add(result)
    return result
  },

  async update(id: string, updates: Partial<CheckInResult>): Promise<void> {
    await db.checkInResults.update(id, stampUpdate(updates))
  },

  async delete(id: string): Promise<void> {
    await db.checkInResults.update(id, stampSoftDelete())
  },
}
