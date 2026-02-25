import { getActiveUserId, nowIso } from '../../auth/userScope'

type Scoped = {
  userId: string
  createdAt: string
  updatedAt: string
  deletedAt: string | null
}

export function stampNew<T extends object>(data: T): T & Scoped {
  const now = nowIso()
  return {
    ...data,
    userId: getActiveUserId(),
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  }
}

export function stampUpdate<T extends object>(data: T): T & { updatedAt: string } {
  return {
    ...data,
    updatedAt: nowIso(),
  }
}

export function stampSoftDelete(): { deletedAt: string; updatedAt: string } {
  const now = nowIso()
  return {
    deletedAt: now,
    updatedAt: now,
  }
}

export function forActiveUser<T extends { userId: string; deletedAt: string | null }>(rows: T[]): T[] {
  const userId = getActiveUserId()
  return rows.filter((row) => row.userId === userId && row.deletedAt === null)
}

export function forActiveUserAny<T extends { userId?: string }>(rows: T[]): T[] {
  const userId = getActiveUserId()
  return rows.filter((row) => (row.userId ?? '__local__') === userId)
}

export function activeUserId(): string {
  return getActiveUserId()
}
