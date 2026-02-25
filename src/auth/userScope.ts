const ACTIVE_USER_ID_KEY = 'julius-active-user-id'

export const LOCAL_USER_ID = '__local__'

export function getActiveUserId(): string {
  return localStorage.getItem(ACTIVE_USER_ID_KEY) ?? LOCAL_USER_ID
}

export function setActiveUserId(userId: string): void {
  localStorage.setItem(ACTIVE_USER_ID_KEY, userId)
}

export function clearActiveUserId(): void {
  localStorage.setItem(ACTIVE_USER_ID_KEY, LOCAL_USER_ID)
}

export function nowIso(): string {
  return new Date().toISOString()
}

export function isLiveRecord<T extends { deletedAt?: string | null }>(row: T): boolean {
  return !row.deletedAt
}
