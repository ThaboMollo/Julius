import { db } from './db'
import type { StatementUpload, CreateStatementUpload } from '../../domain/models'

function generateId(): string {
  return crypto.randomUUID()
}

export const statementUploadRepo = {
  async getAll(): Promise<StatementUpload[]> {
    return db.statementUploads.toArray()
  },

  async getByBankConfig(bankConfigId: string): Promise<StatementUpload[]> {
    return db.statementUploads
      .where('bankConfigId')
      .equals(bankConfigId)
      .toArray()
  },

  async getById(id: string): Promise<StatementUpload | undefined> {
    return db.statementUploads.get(id)
  },

  async create(data: CreateStatementUpload): Promise<StatementUpload> {
    const upload: StatementUpload = { ...data, id: generateId() }
    await db.statementUploads.add(upload)
    return upload
  },

  async delete(id: string): Promise<void> {
    await db.statementUploads.delete(id)
  },
}
