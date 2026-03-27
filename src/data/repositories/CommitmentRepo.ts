import type { Commitment, CreateCommitment, CommitmentStatus } from '../../domain/models'

export interface ICommitmentRepo {
  getAll(): Promise<Commitment[]>
  getByMonth(budgetMonthId: string): Promise<Commitment[]>
  getByStatus(status: CommitmentStatus): Promise<Commitment[]>
  getByLegacyBudgetItemId(legacyBudgetItemId: string): Promise<Commitment | undefined>
  getById(id: string): Promise<Commitment | undefined>
  create(commitment: CreateCommitment): Promise<Commitment>
  update(id: string, updates: Partial<Commitment>): Promise<void>
  delete(id: string): Promise<void>
}
