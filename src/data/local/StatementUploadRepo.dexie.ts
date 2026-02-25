import { db } from './db'
import type { StatementUpload, CreateStatementUpload } from '../../domain/models'
import { activeUserId, forActiveUser, stampNew, stampSoftDelete } from './scoped'

function generateId(): string {
  return crypto.randomUUID()
}

export const statementUploadRepo = {
  async getAll(): Promise<StatementUpload[]> {
    return forActiveUser(await db.statementUploads.toArray())
  },

  async getByBankConfig(bankConfigId: string): Promise<StatementUpload[]> {
    return (await this.getAll()).filter((upload) => upload.bankConfigId === bankConfigId)
  },

  async getById(id: string): Promise<StatementUpload | undefined> {
    const row = await db.statementUploads.get(id)
    if (!row) return undefined
    return row.userId === activeUserId() && row.deletedAt === null ? row : undefined
  },

  async create(data: CreateStatementUpload): Promise<StatementUpload> {
    const upload: StatementUpload = {
      ...stampNew(data),
      id: generateId(),
    }
    await db.statementUploads.add(upload)
    return upload
  },

  async delete(id: string): Promise<void> {
    await db.statementUploads.update(id, stampSoftDelete())
  },
}
