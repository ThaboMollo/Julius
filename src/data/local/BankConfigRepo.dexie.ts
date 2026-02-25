import { db } from './db'
import type { BankConfig, CreateBankConfig } from '../../domain/models'
import { activeUserId, forActiveUser, stampNew, stampSoftDelete, stampUpdate } from './scoped'

function generateId(): string {
  return crypto.randomUUID()
}

export const bankConfigRepo = {
  async getAll(): Promise<BankConfig[]> {
    return forActiveUser(await db.bankConfigs.toArray())
  },

  async getActive(): Promise<BankConfig[]> {
    return (await this.getAll()).filter((b) => b.isActive)
  },

  async getById(id: string): Promise<BankConfig | undefined> {
    const row = await db.bankConfigs.get(id)
    if (!row) return undefined
    return row.userId === activeUserId() && row.deletedAt === null ? row : undefined
  },

  async create(data: CreateBankConfig): Promise<BankConfig> {
    const config: BankConfig = {
      ...stampNew(data),
      id: generateId(),
    }
    await db.bankConfigs.add(config)
    return config
  },

  async update(id: string, updates: Partial<BankConfig>): Promise<void> {
    await db.bankConfigs.update(id, stampUpdate(updates))
  },

  async delete(id: string): Promise<void> {
    await db.bankConfigs.update(id, stampSoftDelete())
  },
}
