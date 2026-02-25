import { db } from './db'
import type { ScenarioExpense, CreateScenarioExpense } from '../../domain/models'
import { activeUserId, forActiveUser, stampNew, stampSoftDelete, stampUpdate } from './scoped'

function generateId(): string {
  return crypto.randomUUID()
}

export const scenarioExpenseRepo = {
  async getAll(): Promise<ScenarioExpense[]> {
    return forActiveUser(await db.scenarioExpenses.toArray())
  },

  async getByScenario(scenarioId: string): Promise<ScenarioExpense[]> {
    return (await this.getAll())
      .filter((expense) => expense.scenarioId === scenarioId)
      .sort((a, b) => a.sortOrder - b.sortOrder)
  },

  async getById(id: string): Promise<ScenarioExpense | undefined> {
    const row = await db.scenarioExpenses.get(id)
    if (!row) return undefined
    return row.userId === activeUserId() && row.deletedAt === null ? row : undefined
  },

  async create(data: CreateScenarioExpense): Promise<ScenarioExpense> {
    const expense: ScenarioExpense = {
      ...stampNew(data),
      id: generateId(),
    }
    await db.scenarioExpenses.add(expense)
    return expense
  },

  async update(id: string, updates: Partial<ScenarioExpense>): Promise<void> {
    await db.scenarioExpenses.update(id, stampUpdate(updates))
  },

  async delete(id: string): Promise<void> {
    await db.scenarioExpenses.update(id, stampSoftDelete())
  },

  async deleteByScenario(scenarioId: string): Promise<void> {
    const rows = await this.getByScenario(scenarioId)
    await Promise.all(rows.map((row) => db.scenarioExpenses.update(row.id, stampSoftDelete())))
  },
}
