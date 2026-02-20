import { db } from './db'
import type { ISettingsRepo } from '../repositories/SettingsRepo'
import type { AppSettings } from '../../domain/models'
import { DEFAULT_PAYDAY_DAY } from '../../domain/constants'

const SETTINGS_ID = 'app-settings'

export const settingsRepo: ISettingsRepo = {
  async get(): Promise<AppSettings> {
    const existing = await db.appSettings.get(SETTINGS_ID)
    if (existing) {
      return existing
    }

    // Create default settings
    const defaultSettings: AppSettings = {
      id: SETTINGS_ID,
      paydayDayOfMonth: DEFAULT_PAYDAY_DAY,
      expectedMonthlyIncome: null,
      updatedAt: new Date(),
    }
    await db.appSettings.add(defaultSettings)
    return defaultSettings
  },

  async update(updates: Partial<AppSettings>): Promise<void> {
    await db.appSettings.update(SETTINGS_ID, {
      ...updates,
      updatedAt: new Date(),
    })
  },
}
