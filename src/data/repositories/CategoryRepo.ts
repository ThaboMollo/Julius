import type { Category, CreateCategory } from '../../domain/models'

export interface ICategoryRepo {
  getAll(): Promise<Category[]>
  getActive(): Promise<Category[]>
  getByGroup(groupId: string): Promise<Category[]>
  getById(id: string): Promise<Category | undefined>
  create(category: CreateCategory): Promise<Category>
  update(id: string, updates: Partial<Category>): Promise<void>
  delete(id: string): Promise<void>
  hasReferences(id: string): Promise<boolean>
}
