import { db } from './db'
import type { PurchaseScenario, CreatePurchaseScenario } from '../../domain/models'

function generateId(): string {
  return crypto.randomUUID()
}

export const purchaseScenarioRepo = {
  async getAll(): Promise<PurchaseScenario[]> {
    return db.purchaseScenarios.toArray()
  },

  async getById(id: string): Promise<PurchaseScenario | undefined> {
    return db.purchaseScenarios.get(id)
  },

  async create(data: CreatePurchaseScenario): Promise<PurchaseScenario> {
    const now = new Date()
    const scenario: PurchaseScenario = {
      ...data,
      id: generateId(),
      createdAt: now,
      updatedAt: now,
    }
    await db.purchaseScenarios.add(scenario)
    return scenario
  },

  async update(id: string, updates: Partial<PurchaseScenario>): Promise<void> {
    await db.purchaseScenarios.update(id, { ...updates, updatedAt: new Date() })
  },

  async delete(id: string): Promise<void> {
    await db.purchaseScenarios.delete(id)
  },
}
