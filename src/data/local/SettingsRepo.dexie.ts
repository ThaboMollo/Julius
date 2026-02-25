import { db } from './db'
import type { ISettingsRepo } from '../repositories/SettingsRepo'
import type { AppSettings } from '../../domain/models'
import { DEFAULT_PAYDAY_DAY } from '../../domain/constants'
import { activeUserId, stampNew, stampUpdate } from './scoped'
import { nowIso } from '../../auth/userScope'

const SETTINGS_ID = 'app-settings'

export const settingsRepo: ISettingsRepo = {
  async get(): Promise<AppSettings> {
    const scopedId = `${SETTINGS_ID}:${activeUserId()}`
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
