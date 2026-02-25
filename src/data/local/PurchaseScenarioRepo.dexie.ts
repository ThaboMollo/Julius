import { db } from './db'
import type { PurchaseScenario, CreatePurchaseScenario } from '../../domain/models'
import { activeUserId, forActiveUser, stampNew, stampSoftDelete, stampUpdate } from './scoped'

function generateId(): string {
  return crypto.randomUUID()
}

export const purchaseScenarioRepo = {
  async getAll(): Promise<PurchaseScenario[]> {
    return forActiveUser(await db.purchaseScenarios.toArray())
  },

  async getById(id: string): Promise<PurchaseScenario | undefined> {
    const row = await db.purchaseScenarios.get(id)
    if (!row) return undefined
    return row.userId === activeUserId() && row.deletedAt === null ? row : undefined
  },

  async create(data: CreatePurchaseScenario): Promise<PurchaseScenario> {
    const scenario: PurchaseScenario = {
      ...stampNew(data),
      id: generateId(),
    }
    await db.purchaseScenarios.add(scenario)
    return scenario
  },

  async update(id: string, updates: Partial<PurchaseScenario>): Promise<void> {
    await db.purchaseScenarios.update(id, stampUpdate(updates))
  },

  async delete(id: string): Promise<void> {
    await db.purchaseScenarios.update(id, stampSoftDelete())
  },
}
