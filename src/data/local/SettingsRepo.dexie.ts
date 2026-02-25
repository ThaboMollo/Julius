import { db } from './db'
import type { ISettingsRepo } from '../repositories/SettingsRepo'
import type { AppSettings } from '../../domain/models'
import { DEFAULT_PAYDAY_DAY } from '../../domain/constants'
import { activeUserId, stampNew, stampUpdate } from './scoped'
import { LOCAL_USER_ID, nowIso } from '../../auth/userScope'

const SETTINGS_ID = 'app-settings'

export const settingsRepo: ISettingsRepo = {
  async get(): Promise<AppSettings> {
    const userId = activeUserId()
    const scopedId = `${SETTINGS_ID}:${userId}`
    const existing = await db.appSettings.get(scopedId)
    if (existing && existing.deletedAt === null) {
      if (typeof existing.cloudModeEnabled === 'undefined') {
        const patched: AppSettings = {
          ...existing,
          cloudModeEnabled: false,
          updatedAt: nowIso(),
        }
        await db.appSettings.put(patched)
        return patched
      }
      return existing
    }

    // Backward-compat: legacy single-record row without scoped id.
    const legacy = await db.appSettings.get(SETTINGS_ID)
    if (legacy && legacy.deletedAt === null && legacy.userId === userId) {
      const migrated: AppSettings = {
        ...legacy,
        id: scopedId,
        updatedAt: nowIso(),
      }
      await db.appSettings.delete(SETTINGS_ID)
      await db.appSettings.put(migrated)
      return migrated
    }

    // Backward-compat: after userId migration the record still has
    // id = 'app-settings:__local__' but userId was already updated to the
    // authenticated user id. Rename the primary key to the user-scoped id.
    if (userId !== LOCAL_USER_ID) {
      const localScopedId = `${SETTINGS_ID}:${LOCAL_USER_ID}`
      const fromLocal = await db.appSettings.get(localScopedId)
      if (fromLocal && fromLocal.deletedAt === null && fromLocal.userId === userId) {
        const migrated: AppSettings = {
          ...fromLocal,
          id: scopedId,
          updatedAt: nowIso(),
        }
        await db.appSettings.delete(localScopedId)
        await db.appSettings.put(migrated)
        return migrated
      }
    }

    const defaultSettings: AppSettings = {
      ...stampNew({
        paydayDayOfMonth: DEFAULT_PAYDAY_DAY,
        expectedMonthlyIncome: null,
        cloudModeEnabled: false,
      }),
      id: scopedId,
    }
    await db.appSettings.put(defaultSettings)
    return defaultSettings
  },

  async update(updates: Partial<AppSettings>): Promise<void> {
    const current = await this.get()
    await db.appSettings.update(current.id, stampUpdate(updates))
  },
}
