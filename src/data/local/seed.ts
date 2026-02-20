import { db } from './db'
import { budgetGroupRepo } from './BudgetGroupRepo.dexie'
import { categoryRepo } from './CategoryRepo.dexie'
import { settingsRepo } from './SettingsRepo.dexie'
import { DEFAULT_GROUPS, DEFAULT_CATEGORIES } from '../../domain/constants'

export async function seedDefaults(): Promise<void> {
  // Seed groups if none exist
  const existingGroups = await db.budgetGroups.count()
  if (existingGroups === 0) {
    const groupMap = new Map<string, string>()

    for (const groupDef of DEFAULT_GROUPS) {
      const group = await budgetGroupRepo.create({
        name: groupDef.name,
        sortOrder: groupDef.sortOrder,
        isDefault: true,
        isActive: true,
      })
      groupMap.set(groupDef.name, group.id)
    }

    // Seed categories
    for (const [groupName, categoryNames] of Object.entries(DEFAULT_CATEGORIES)) {
      const groupId = groupMap.get(groupName)
      if (groupId) {
        for (const categoryName of categoryNames) {
          await categoryRepo.create({
            name: categoryName,
            groupId,
            isDefault: true,
            isActive: true,
          })
        }
      }
    }
  }

  // Ensure settings exist
  await settingsRepo.get()
}
