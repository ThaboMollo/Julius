import { db } from './db'
import type { BankConfig, CreateBankConfig } from '../../domain/models'

function generateId(): string {
  return crypto.randomUUID()
}

export const bankConfigRepo = {
  async getAll(): Promise<BankConfig[]> {
    return db.bankConfigs.toArray()
  },

  async getActive(): Promise<BankConfig[]> {
    return db.bankConfigs.filter((b) => b.isActive).toArray()
  },

  async getById(id: string): Promise<BankConfig | undefined> {
    return db.bankConfigs.get(id)
  },

  async create(data: CreateBankConfig): Promise<BankConfig> {
    const now = new Date()
    const config: BankConfig = {
      ...data,
      id: generateId(),
      createdAt: now,
      updatedAt: now,
    }
    await db.bankConfigs.add(config)
    return config
  },

  async update(id: string, updates: Partial<BankConfig>): Promise<void> {
    await db.bankConfigs.update(id, { ...updates, updatedAt: new Date() })
  },

  async delete(id: string): Promise<void> {
    await db.bankConfigs.delete(id)
  },
}
