import { db } from './db'
import type { ICommitmentRepo } from '../repositories/CommitmentRepo'
import type { Commitment, CreateCommitment, CommitmentStatus } from '../../domain/models'
import { activeUserId, forActiveUser, stampNew, stampSoftDelete, stampUpdate } from './scoped'

function generateId(): string {
  return crypto.randomUUID()
}

export const commitmentRepo: ICommitmentRepo = {
  async getAll(): Promise<Commitment[]> {
    return forActiveUser(await db.commitments.toArray())
  },

  async getByMonth(budgetMonthId: string): Promise<Commitment[]> {
    return (await this.getAll()).filter((commitment) => commitment.budgetMonthId === budgetMonthId)
  },

  async getByStatus(status: CommitmentStatus): Promise<Commitment[]> {
    return (await this.getAll()).filter((commitment) => commitment.status === status)
  },

  async getByLegacyBudgetItemId(legacyBudgetItemId: string): Promise<Commitment | undefined> {
    return (await this.getAll()).find((commitment) => commitment.legacyBudgetItemId === legacyBudgetItemId)
  },

  async getById(id: string): Promise<Commitment | undefined> {
    const row = await db.commitments.get(id)
    if (!row) return undefined
    return row.userId === activeUserId() && row.deletedAt === null ? row : undefined
  },

  async create(commitment: CreateCommitment): Promise<Commitment> {
    const newCommitment: Commitment = {
      ...stampNew(commitment),
      id: generateId(),
    }
    await db.commitments.add(newCommitment)
    return newCommitment
  },

  async update(id: string, updates: Partial<Commitment>): Promise<void> {
    await db.commitments.update(id, stampUpdate(updates))
  },

  async delete(id: string): Promise<void> {
    await db.commitments.update(id, stampSoftDelete())
  },
}
