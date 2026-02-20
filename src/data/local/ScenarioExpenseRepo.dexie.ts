import { db } from './db'
import type { ScenarioExpense, CreateScenarioExpense } from '../../domain/models'

function generateId(): string {
  return crypto.randomUUID()
}

export const scenarioExpenseRepo = {
  async getAll(): Promise<ScenarioExpense[]> {
    return db.scenarioExpenses.toArray()
  },

  async getByScenario(scenarioId: string): Promise<ScenarioExpense[]> {
    return db.scenarioExpenses
      .where('scenarioId')
      .equals(scenarioId)
      .sortBy('sortOrder')
  },

  async getById(id: string): Promise<ScenarioExpense | undefined> {
    return db.scenarioExpenses.get(id)
  },

  async create(data: CreateScenarioExpense): Promise<ScenarioExpense> {
    const now = new Date()
    const expense: ScenarioExpense = {
      ...data,
      id: generateId(),
      createdAt: now,
      updatedAt: now,
    }
    await db.scenarioExpenses.add(expense)
    return expense
  },

  async update(id: string, updates: Partial<ScenarioExpense>): Promise<void> {
    await db.scenarioExpenses.update(id, { ...updates, updatedAt: new Date() })
  },

  async delete(id: string): Promise<void> {
    await db.scenarioExpenses.delete(id)
  },

  async deleteByScenario(scenarioId: string): Promise<void> {
    await db.scenarioExpenses.where('scenarioId').equals(scenarioId).delete()
  },
}
