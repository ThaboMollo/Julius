import type { AppSettings } from '../../domain/models'

export interface ISettingsRepo {
  get(): Promise<AppSettings>
  update(updates: Partial<AppSettings>): Promise<void>
}
